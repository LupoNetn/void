import {
    BadRequestException,
    ConflictException,
    NotFoundException,
    HttpException,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';
import { CreateNotificationTemplate } from './dto/create-template.dto.js';
import { UpdateNotificationTemplateDto } from './dto/update-template.dto.js';
import { QueryNotificationTemplateDto } from './dto/query-template.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { SendNotificationDTO } from './dto/send-notification.dto.js';
import { QueryNotificationsDto } from './dto/query-notifications.dto.js';
import { DispatchService } from './dispatch.service.js';
import type { BatchNotificationItemDto } from './dto/send-batch.dto.js';

const TEMPLATE_SELECT_FIELDS = {
    id: true,
    name: true,
    slug: true,
    channel: true,
    subject: true,
    body: true,
    version: true,
    active: true,
    createdAt: true,
    updatedAt: true,
} as const;

@Injectable()
export class NotificationsService {
    constructor(private readonly prisma: PrismaService, private readonly dispatcher: DispatchService) { }

    private render(value: string | null | undefined, variables: Record<string, unknown>) {
        if (!value) return value;
        return value.replace(/{{\s*([\w.]+)\s*}}/g, (_, path: string) => {
            const result = path.split('.').reduce<unknown>((current, key) => current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined, variables);
            return result === undefined || result === null ? '' : String(result);
        });
    }

    async send(organizationId: string, dto: SendNotificationDTO, idempotencyKey?: string) {
        const recipientFields: Record<string, keyof typeof dto.recipient> = { EMAIL: 'email', SMS: 'phone', PUSH: 'pushToken', WEBHOOK: 'webhookUrl', IN_APP: 'externalUserId' };
        const requiredRecipient = recipientFields[dto.channel];
        if (!requiredRecipient || !dto.recipient[requiredRecipient]?.trim()) {
            throw new BadRequestException(`${dto.channel} notifications require recipient.${String(requiredRecipient)}.`);
        }
        const requestHash = createHash('sha256').update(JSON.stringify(dto)).digest('hex');
        if (idempotencyKey) {
            const existing = await this.prisma.idempotencyKey.findUnique({ where: { organizationId_key: { organizationId, key: idempotencyKey } } });
            if (existing) {
                if (existing.requestHash !== requestHash) throw new ConflictException('This idempotency key was already used with a different request.');
                return existing.responseBody;
            }
        }
        const template = dto.template ? await this.prisma.notificationTemplate.findFirst({ where: { organizationId, slug: dto.template, channel: dto.channel, active: true }, orderBy: { version: 'desc' } }) : null;
        if (dto.template && !template) throw new NotFoundException(`Active template '${dto.template}' was not found for ${dto.channel}.`);
        if (!template && !dto.content) throw new BadRequestException('Provide content or an active template slug.');
        const variables = { ...dto.variables, recipient: dto.recipient };
        const notification = await this.prisma.notification.create({ data: {
            organizationId, templateId: template?.id, externalId: dto.externalId,
            channel: dto.channel, recipient: dto.recipient as unknown as Prisma.InputJsonValue,
            subject: this.render(dto.subject ?? template?.subject, variables),
            content: this.render(dto.content ?? template?.body, variables), metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
            scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        } });
        const response = { message: 'Notification accepted for delivery.', data: notification };
        if (idempotencyKey) await this.prisma.idempotencyKey.create({ data: { organizationId, key: idempotencyKey, requestHash, responseCode: 202, responseBody: response as unknown as Prisma.InputJsonValue, expiresAt: new Date(Date.now() + 86400000) } });
        if (!notification.scheduledAt || notification.scheduledAt <= new Date()) this.dispatcher.wake(notification.id);
        return response;
    }

    async sendBatch(organizationId: string, items: BatchNotificationItemDto[], idempotencyKey?: string) {
        if (idempotencyKey && idempotencyKey.length > 200) throw new BadRequestException('Batch idempotency keys cannot exceed 200 characters.');
        const batchKey = idempotencyKey ? `batch:${idempotencyKey}` : undefined;
        const requestHash = createHash('sha256').update(JSON.stringify(items)).digest('hex');
        if (batchKey) {
            const existing = await this.prisma.idempotencyKey.findUnique({ where: { organizationId_key: { organizationId, key: batchKey } } });
            if (existing) {
                if (existing.requestHash !== requestHash) throw new ConflictException('This batch idempotency key was already used with a different request.');
                return existing.responseBody;
            }
        }

        const results = Array.from({ length: items.length }) as Array<Record<string, unknown>>;
        let cursor = 0;
        const workers = Array.from({ length: Math.min(10, items.length) }, async () => {
            while (cursor < items.length) {
                const index = cursor++;
                const item = items[index];
                const { idempotencyKey: itemKey, ...notification } = item;
                try {
                    const response = await this.send(organizationId, notification, itemKey ?? (idempotencyKey ? `${idempotencyKey}:${index}` : undefined));
                    results[index] = { index, accepted: true, notification: (response as { data: unknown }).data };
                } catch (error) {
                    const statusCode = error instanceof HttpException ? error.getStatus() : 500;
                    results[index] = { index, accepted: false, statusCode, error: error instanceof Error ? error.message : 'Notification could not be accepted.' };
                }
            }
        });
        await Promise.all(workers);
        const accepted = results.filter(result => result.accepted).length;
        const response = { message: 'Batch processed.', data: { total: items.length, accepted, rejected: items.length - accepted, results } };
        if (batchKey) {
            await this.prisma.idempotencyKey.create({ data: { organizationId, key: batchKey, requestHash, responseCode: 202, responseBody: response as unknown as Prisma.InputJsonValue, expiresAt: new Date(Date.now() + 86_400_000) } });
        }
        return response;
    }

    async list(organizationId: string, query: QueryNotificationsDto) {
        const page = query.page ?? 1; const limit = query.limit ?? 20;
        const where: Prisma.NotificationWhereInput = { organizationId };
        if (query.status) where.status = query.status;
        if (query.channel) where.channel = query.channel;
        if (query.search) where.OR = [{ externalId: { contains: query.search, mode: 'insensitive' } }, { subject: { contains: query.search, mode: 'insensitive' } }];
        const [data, total] = await this.prisma.$transaction([
            this.prisma.notification.findMany({ where, include: { deliveries: { orderBy: { attemptNumber: 'desc' }, take: 1 } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
            this.prisma.notification.count({ where }),
        ]);
        return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }

    async get(organizationId: string, id: string) {
        const data = await this.prisma.notification.findFirst({ where: { id, organizationId }, include: { deliveries: { orderBy: { attemptNumber: 'desc' } }, template: { select: TEMPLATE_SELECT_FIELDS } } });
        if (!data) throw new NotFoundException('Notification not found.');
        return { data };
    }

    async cancel(organizationId: string, id: string) {
        const updated = await this.prisma.notification.updateMany({ where: { id, organizationId, status: { in: ['QUEUED', 'RETRYING'] } }, data: { status: 'CANCELLED' } });
        if (!updated.count) throw new ConflictException('Only queued or retrying notifications can be cancelled.');
        return { message: 'Notification cancelled.' };
    }

    async stats(organizationId: string) {
        const [total, sent, failed, queued, recent, byChannel] = await Promise.all([
            this.prisma.notification.count({ where: { organizationId } }),
            this.prisma.notification.count({ where: { organizationId, status: 'SENT' } }),
            this.prisma.notification.count({ where: { organizationId, status: 'FAILED' } }),
            this.prisma.notification.count({ where: { organizationId, status: { in: ['QUEUED', 'PROCESSING', 'RETRYING'] } } }),
            this.prisma.notification.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' }, take: 6, select: { id: true, externalId: true, channel: true, status: true, subject: true, createdAt: true } }),
            this.prisma.notification.groupBy({ by: ['channel'], where: { organizationId }, _count: true }),
        ]);
        return { data: { total, sent, failed, queued, deliveryRate: total ? Math.round((sent / total) * 1000) / 10 : 100, recent, byChannel: byChannel.map(x => ({ channel: x.channel, count: x._count })) } };
    }

    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // strip diacritics/accents
            .replace(/[^\w\s-]/g, '')         // remove non-alphanumeric characters
            .replace(/[\s_-]+/g, '-')        // collapse spaces/underscores/hyphens to a single hyphen
            .replace(/^-+|-+$/g, '');        // trim leading/trailing hyphens
    }

    async createTemplate(organizationId: string, body: CreateNotificationTemplate) {
        if (!organizationId) {
            throw new BadRequestException('Organization ID is required.');
        }

        const { name, channel, subject, body: bodymessage, active } = body;
        const slug = this.generateSlug(name);

        try {
            const template = await this.prisma.$transaction(async (tx) => {
                const latestTemplate = await tx.notificationTemplate.findFirst({
                    where: {
                        organizationId,
                        slug,
                    },
                    orderBy: {
                        version: 'desc',
                    },
                });
                
                const nextVersion = latestTemplate ? latestTemplate.version + 1 : 1;

                if (active && latestTemplate) {
                    await tx.notificationTemplate.update({
                        where: {
                            id: latestTemplate.id,
                        },
                        data: {
                            active: false,
                        },
                    });
                }

                return tx.notificationTemplate.create({
                    data: {
                        organizationId,
                        name,
                        slug,
                        channel,
                        subject,
                        body: bodymessage,
                        version: nextVersion,
                        active: active ?? true,
                    },
                    select: TEMPLATE_SELECT_FIELDS,
                });
            });

            return {
                message: 'Notification template created successfully',
                data: template,
            };

        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    throw new ConflictException('A notification template with this slug and version already exists.');
                }
            }

            if (error instanceof HttpException) {
                throw error;
            }

            throw new InternalServerErrorException('An error occurred while creating the notification template.');
        }
    }

    async listTemplates(organizationId: string, query?: QueryNotificationTemplateDto) {
        if (!organizationId) {
            throw new BadRequestException('Organization ID is required.');
        }

        const page = query?.page && query.page > 0 ? query.page : 1;
        const limit = query?.limit && query.limit > 0 ? Math.min(query.limit, 100) : 10;
        const skip = (page - 1) * limit;

        const where: Prisma.NotificationTemplateWhereInput = {
            organizationId,
        };

        if (query?.channel) {
            where.channel = query.channel;
        }

        if (query?.active !== undefined) {
            where.active = query.active;
        }

        if (query?.search) {
            where.OR = [
                { name: { contains: query.search, mode: 'insensitive' } },
                { slug: { contains: query.search, mode: 'insensitive' } },
                { subject: { contains: query.search, mode: 'insensitive' } },
            ];
        }

        try {
            const [templates, total] = await this.prisma.$transaction([
                this.prisma.notificationTemplate.findMany({
                    where,
                    select: TEMPLATE_SELECT_FIELDS,
                    orderBy: {
                        createdAt: 'desc',
                    },
                    skip,
                    take: limit,
                }),
                this.prisma.notificationTemplate.count({ where }),
            ]);

            return {
                message: 'Notification templates retrieved successfully',
                data: templates,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            };
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }

            throw new InternalServerErrorException('An error occurred while retrieving notification templates.');
        }
    }

    async getTemplateById(organizationId: string, id: string) {
        if (!organizationId) {
            throw new BadRequestException('Organization ID is required.');
        }

        if (!id) {
            throw new BadRequestException('Template ID is required.');
        }

        try {
            const template = await this.prisma.notificationTemplate.findFirst({
                where: {
                    id,
                    organizationId,
                },
                select: TEMPLATE_SELECT_FIELDS,
            });

            if (!template) {
                throw new NotFoundException('Template not found.');
            }

            return {
                message: 'Notification template retrieved successfully',
                data: template,
            };
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }

            throw new InternalServerErrorException('An error occurred while retrieving the notification template.');
        }
    }

    async getTemplateBySlug(organizationId: string, slug: string, version?: number) {
        if (!organizationId) {
            throw new BadRequestException('Organization ID is required.');
        }

        if (!slug) {
            throw new BadRequestException('Template slug is required.');
        }

        try {
            const where: Prisma.NotificationTemplateWhereInput = {
                organizationId,
                slug,
            };

            if (version) {
                where.version = version;
            } else {
                where.active = true;
            }

            let template = await this.prisma.notificationTemplate.findFirst({
                where,
                orderBy: {
                    version: 'desc',
                },
                select: TEMPLATE_SELECT_FIELDS,
            });

            // If querying by slug without a specific version and no active version was found, fallback to latest version
            if (!template && !version) {
                template = await this.prisma.notificationTemplate.findFirst({
                    where: {
                        organizationId,
                        slug,
                    },
                    orderBy: {
                        version: 'desc',
                    },
                    select: TEMPLATE_SELECT_FIELDS,
                });
            }

            if (!template) {
                throw new NotFoundException(`Template with slug "${slug}" not found.`);
            }

            return {
                message: 'Notification template retrieved successfully',
                data: template,
            };
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }

            throw new InternalServerErrorException('An error occurred while retrieving the notification template.');
        }
    }

    async updateTemplate(organizationId: string, id: string, body: UpdateNotificationTemplateDto) {
        if (!organizationId) {
            throw new BadRequestException('Organization ID is required.');
        }

        if (!id) {
            throw new BadRequestException('Template ID is required.');
        }

        try {
            const existingTemplate = await this.prisma.notificationTemplate.findFirst({
                where: {
                    id,
                    organizationId,
                },
            });

            if (!existingTemplate) {
                throw new NotFoundException('Template not found.');
            }

            const updatedTemplate = await this.prisma.$transaction(async (tx) => {
                // If setting this template as active, deactivate other versions of this slug
                if (body.active === true) {
                    await tx.notificationTemplate.updateMany({
                        where: {
                            organizationId,
                            slug: existingTemplate.slug,
                            id: { not: id },
                            active: true,
                        },
                        data: {
                            active: false,
                        },
                    });
                }

                return tx.notificationTemplate.update({
                    where: { id },
                    data: {
                        ...(body.name !== undefined && { name: body.name }),
                        ...(body.subject !== undefined && { subject: body.subject }),
                        ...(body.body !== undefined && { body: body.body }),
                        ...(body.active !== undefined && { active: body.active }),
                    },
                    select: TEMPLATE_SELECT_FIELDS,
                });
            });

            return {
                message: 'Notification template updated successfully',
                data: updatedTemplate,
            };
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }

            throw new InternalServerErrorException('An error occurred while updating the notification template.');
        }
    }

    async deleteTemplate(organizationId: string, id: string) {
        if (!organizationId) {
            throw new BadRequestException('Organization ID is required.');
        }

        if (!id) {
            throw new BadRequestException('Template ID is required.');
        }

        try {
            const existingTemplate = await this.prisma.notificationTemplate.findFirst({
                where: {
                    id,
                    organizationId,
                },
            });

            if (!existingTemplate) {
                throw new NotFoundException('Template not found.');
            }

            await this.prisma.notificationTemplate.delete({
                where: { id },
            });

            return {
                message: 'Notification template deleted successfully',
            };
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }

            throw new InternalServerErrorException('An error occurred while deleting the notification template.');
        }
    }
}
