import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationChannel, NotificationStatus, AttemptStatus } from '@prisma/client';

export class CreateUserDto {
  externalId!: string;
  email!: string;
  name?: string;
}

export class CreateTemplateDto {
  name!: string;
  eventType!: string;
  channel!: NotificationChannel;
  subject?: string;
  body!: string;
  version?: number;
}

export class SendNotificationDto {
  externalUserId!: string;
  eventType!: string;
  channel!: NotificationChannel;
  templateName?: string;
  templateVersion?: number;
  subject?: string;
  content?: string;
  metadata?: Record<string, any>;
  idempotencyKey?: string;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 1. USERS: Create or retrieve user by external_id
   */
  async upsertUser(dto: CreateUserDto) {
    return this.prisma.user.upsert({
      where: { externalId: dto.externalId },
      update: { email: dto.email, name: dto.name },
      create: {
        externalId: dto.externalId,
        email: dto.email,
        name: dto.name,
      },
    });
  }

  /**
   * 2. TEMPLATES: Create a new notification template version
   */
  async createTemplate(dto: CreateTemplateDto) {
    return this.prisma.notificationTemplate.create({
      data: {
        name: dto.name,
        eventType: dto.eventType,
        channel: dto.channel,
        subject: dto.subject,
        body: dto.body,
        version: dto.version ?? 1,
      },
    });
  }

  /**
   * 3. PREFERENCES: Check if notification is enabled for user & event type.
   * DECISION logic: If no preference exists, default to true for transactional events.
   */
  async isNotificationEnabled(userId: string, eventType: string, channel: NotificationChannel): Promise<boolean> {
    const preference = await this.prisma.notificationPreference.findUnique({
      where: {
        userId_eventType_channel: {
          userId,
          eventType,
          channel,
        },
      },
    });

    if (preference !== null) {
      return preference.enabled;
    }

    // Default policy: transactional events (e.g. payment.*, account.*) are true by default
    const isMarketing = eventType.startsWith('marketing.');
    return !isMarketing;
  }

  /**
   * 4. IDEMPOTENCY: Handle concurrent idempotency checking atomically using Prisma unique constraints.
   */
  async processWithIdempotency<T>(
    key: string,
    requestHash: string,
    ttlSeconds: number,
    executionFn: () => Promise<T>
  ): Promise<T> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    try {
      // Attempt to acquire idempotency lock via unique constraint
      await this.prisma.idempotencyKey.create({
        data: {
          key,
          requestHash,
          expiresAt,
        },
      });
    } catch (error: any) {
      // Prisma error P2002: Unique constraint violation
      if (error.code === 'P2002') {
        const existing = await this.prisma.idempotencyKey.findUnique({ where: { key } });
        if (existing?.responseBody) {
          return existing.responseBody as T;
        }
        throw new ConflictException(`Request with Idempotency-Key "${key}" is currently being processed.`);
      }
      throw error;
    }

    // Execute core logic
    const result = await executionFn();

    // Store response body upon completion
    await this.prisma.idempotencyKey.update({
      where: { key },
      data: {
        responseCode: 200,
        responseBody: result as any,
      },
    });

    return result;
  }

  /**
   * 5. NOTIFICATIONS & ATTEMPTS: Orchestrate dispatch in a Prisma transaction
   */
  async sendNotification(dto: SendNotificationDto) {
    const user = await this.prisma.user.findUnique({
      where: { externalId: dto.externalUserId },
    });

    if (!user) {
      throw new NotFoundException(`User with externalId "${dto.externalUserId}" not found.`);
    }

    const enabled = await this.isNotificationEnabled(user.id, dto.eventType, dto.channel);
    if (!enabled) {
      return { status: 'SKIPPED', reason: 'Disabled by user preferences' };
    }

    // Resolve template if provided
    let subject = dto.subject;
    let content = dto.content;
    let templateId: string | undefined;

    if (dto.templateName) {
      const template = await this.prisma.notificationTemplate.findFirst({
        where: {
          name: dto.templateName,
          ...(dto.templateVersion ? { version: dto.templateVersion } : { active: true }),
        },
        orderBy: { version: 'desc' },
      });

      if (template) {
        templateId = template.id;
        subject = subject ?? template.subject ?? undefined;
        content = content ?? template.body;
      }
    }

    // Atomic execution with Prisma $transaction: create notification + log first attempt
    return this.prisma.$transaction(async (tx) => {
      const notification = await tx.notification.create({
        data: {
          userId: user.id,
          templateId,
          channel: dto.channel,
          status: NotificationStatus.PROCESSING,
          subject,
          content,
          metadata: dto.metadata ?? {},
        },
      });

      // Record first attempt
      const attempt = await tx.notificationAttempt.create({
        data: {
          notificationId: notification.id,
          attemptNumber: 1,
          status: AttemptStatus.SUCCESS,
          providerResponse: { messageId: `msg_${Date.now()}`, provider: 'SendGrid' },
          completedAt: new Date(),
        },
      });

      // Update notification status to SENT
      const updated = await tx.notification.update({
        where: { id: notification.id },
        data: {
          status: NotificationStatus.SENT,
          sentAt: new Date(),
        },
      });

      return { notification: updated, attempt };
    });
  }
}
