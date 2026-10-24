import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DeliveryStatus, NotificationChannel, NotificationStatus, Prisma } from '@prisma/client';
import { createHmac } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProviderCredentialsService } from '../provider-credentials/provider-credentials.service.js';

type Credentials = Record<string, string | number>;

@Injectable()
export class DispatchService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DispatchService.name);
  private timer?: NodeJS.Timeout;
  private polling = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly providers: ProviderCredentialsService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.poll(), 3000);
    this.timer.unref();
    void this.poll();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  wake(notificationId: string) {
    setImmediate(() => void this.process(notificationId));
  }

  private async poll() {
    if (this.polling) return;
    this.polling = true;
    try {
      await this.prisma.notification.updateMany({
        where: { status: NotificationStatus.PROCESSING, updatedAt: { lt: new Date(Date.now() - 120_000) } },
        data: { status: NotificationStatus.RETRYING },
      });
      const jobs = await this.prisma.notification.findMany({
        where: {
          status: { in: [NotificationStatus.QUEUED, NotificationStatus.RETRYING] },
          OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date() } }],
        },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
        take: 20,
      });
      await Promise.allSettled(jobs.map(({ id }) => this.process(id)));
    } catch (error) {
      this.logger.error('Notification polling failed', error);
    } finally {
      this.polling = false;
    }
  }

  async process(id: string) {
    const claimed = await this.prisma.notification.updateMany({
      where: { id, status: { in: [NotificationStatus.QUEUED, NotificationStatus.RETRYING] } },
      data: { status: NotificationStatus.PROCESSING },
    });
    if (!claimed.count) return;

    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) return;
    const priorAttempts = await this.prisma.delivery.count({ where: { notificationId: id } });
    const attemptNumber = priorAttempts + 1;
    const delivery = await this.prisma.delivery.create({
      data: { notificationId: id, attemptNumber, status: DeliveryStatus.RETRYING },
    });

    try {
      const configured = await this.providers.getDecryptedCredential(
        notification.organizationId,
        notification.channel,
      );
      const result = await this.deliver(notification.channel, notification.recipient as Record<string, string>, notification.subject, notification.content ?? '', configured?.provider, configured?.credentials as Credentials | undefined);
      await this.prisma.$transaction([
        this.prisma.delivery.update({
          where: { id: delivery.id },
          data: { status: DeliveryStatus.SUCCESS, provider: result.provider, providerResponse: result.response as Prisma.InputJsonValue, completedAt: new Date() },
        }),
        this.prisma.notification.update({
          where: { id },
          data: { status: NotificationStatus.SENT, sentAt: new Date(), failedAt: null },
        }),
      ]);
      await this.emitClientWebhooks(notification.organizationId, 'notification.sent', { notificationId: id, externalId: notification.externalId, channel: notification.channel, provider: result.provider });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown delivery error';
      const retry = attemptNumber < 3;
      await this.prisma.$transaction([
        this.prisma.delivery.update({ where: { id: delivery.id }, data: { status: retry ? DeliveryStatus.RETRYING : DeliveryStatus.FAILED, errorMessage: message, completedAt: new Date() } }),
        this.prisma.notification.update({ where: { id }, data: { status: retry ? NotificationStatus.RETRYING : NotificationStatus.FAILED, failedAt: retry ? null : new Date() } }),
      ]);
      if (!retry) await this.emitClientWebhooks(notification.organizationId, 'notification.failed', { notificationId: id, error: message });
      this.logger.warn(`Delivery ${id} attempt ${attemptNumber} failed: ${message}`);
    }
  }

  private async deliver(channel: NotificationChannel, recipient: Record<string, string>, subject: string | null, content: string, provider?: string, credentials?: Credentials) {
    if (channel === NotificationChannel.IN_APP) return { provider: 'internal', response: { accepted: true } };
    if (!provider || !credentials) throw new Error(`No active provider configured for ${channel}`);
    const normalized = provider.toLowerCase();
    if (normalized === 'resend') {
      return this.request('resend', 'https://api.resend.com/emails', { Authorization: `Bearer ${credentials.apiKey}` }, { from: credentials.from, to: [recipient.email], subject, html: content });
    }
    if (normalized === 'sendgrid') {
      return this.request('sendgrid', 'https://api.sendgrid.com/v3/mail/send', { Authorization: `Bearer ${credentials.apiKey}` }, { personalizations: [{ to: [{ email: recipient.email }] }], from: { email: credentials.from }, subject, content: [{ type: 'text/html', value: content }] });
    }
    if (normalized === 'postmark') {
      return this.request('postmark', 'https://api.postmarkapp.com/email', { 'X-Postmark-Server-Token': String(credentials.apiKey) }, { From: credentials.from, To: recipient.email, Subject: subject, HtmlBody: content });
    }
    if (normalized === 'twilio') {
      const form = new URLSearchParams({ To: recipient.phone, From: String(credentials.from), Body: content });
      const auth = Buffer.from(`${credentials.accountSid}:${credentials.authToken}`).toString('base64');
      return this.request('twilio', `https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}/Messages.json`, { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }, form);
    }
    if (normalized === 'fcm') {
      return this.request('fcm', 'https://fcm.googleapis.com/fcm/send', { Authorization: `key=${credentials.serverKey}` }, { to: recipient.pushToken, notification: { title: subject, body: content } });
    }
    if (normalized === 'webhook') {
      const url = recipient.webhookUrl || String(credentials.url);
      return this.request('webhook', url, credentials.secret ? { 'X-Webhook-Signature': createHmac('sha256', String(credentials.secret)).update(content).digest('hex') } : {}, { subject, content });
    }
    throw new Error(`Unsupported provider: ${provider}`);
  }

  private async request(provider: string, url: string, headers: Record<string, string>, body: unknown) {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: body instanceof URLSearchParams ? body : JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    const text = await response.text();
    let payload: Prisma.InputJsonValue = text;
    try { payload = text ? JSON.parse(text) as Prisma.InputJsonValue : {}; } catch { /* keep text */ }
    if (!response.ok) throw new Error(`${provider} returned ${response.status}: ${text.slice(0, 300)}`);
    return { provider, response: { status: response.status, body: payload } };
  }

  async emitClientWebhooks(organizationId: string, event: string, data: Record<string, unknown>) {
    const endpoints = await this.prisma.webhookUrl.findMany({ where: { organizationId, active: true } });
    const payload = JSON.stringify({ id: crypto.randomUUID(), event, createdAt: new Date().toISOString(), data });
    await Promise.allSettled(endpoints.map((endpoint) => fetch(endpoint.url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Vod-Signature': createHmac('sha256', endpoint.secret).update(payload).digest('hex') }, body: payload, signal: AbortSignal.timeout(10000) })));
  }
}
