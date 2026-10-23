import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class WebhooksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string) {
    const data = await this.prisma.webhookUrl.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' }, select: { id: true, url: true, active: true, createdAt: true, updatedAt: true } });
    return { data };
  }

  async create(organizationId: string, url: string, suppliedSecret?: string, active = true) {
    const secret = suppliedSecret || `whsec_${randomBytes(24).toString('hex')}`;
    const data = await this.prisma.webhookUrl.create({ data: { organizationId, url, secret, active }, select: { id: true, url: true, active: true, createdAt: true } });
    return { message: 'Webhook endpoint created. Store the signing secret; it is only returned once.', data, secret };
  }

  async remove(organizationId: string, id: string) {
    const result = await this.prisma.webhookUrl.deleteMany({ where: { id, organizationId } });
    if (!result.count) throw new NotFoundException('Webhook endpoint not found.');
    return { message: 'Webhook endpoint deleted.' };
  }

  async ingest(provider: string, payload: Record<string, unknown>) {
    const providerMessageId = String(payload.sg_message_id ?? payload.MessageSid ?? payload.messageId ?? payload.id ?? '') || null;
    const eventType = String(payload.event ?? payload.MessageStatus ?? payload.status ?? 'received');
    const delivery = providerMessageId ? await this.prisma.delivery.findFirst({ where: { providerResponse: { path: ['body', 'id'], equals: providerMessageId } } }) : null;
    const data = await this.prisma.webhookHandle.create({ data: { provider: provider.toLowerCase(), providerMessageId, eventType, payload: payload as Prisma.InputJsonValue, deliveryId: delivery?.id } });
    if (delivery && ['failed', 'bounced', 'undelivered'].includes(eventType.toLowerCase())) await this.prisma.notification.update({ where: { id: delivery.notificationId }, data: { status: 'FAILED', failedAt: new Date() } });
    return { received: true, id: data.id };
  }
}
