import {
    BadRequestException,
    ConflictException,
    HttpException,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';
import { CreateNotificationTemplate } from './dto/create-template.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class NotificationsService {
    constructor(private readonly prisma: PrismaService) { }

    
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
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        channel: true,
                        subject: true,
                        body: true,
                        version: true,
                        active: true,
                        createdAt: true,
                    },
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

    async listTemplates(organizationId: string) {
        if (!organizationId) {
            throw new BadRequestException('Organization ID is required.');
        }

        try {
            const templates = await this.prisma.notificationTemplate.findMany({
                where: {
                    organizationId,
                },
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    channel: true,
                    subject: true,
                    body: true,
                    version: true,
                    active: true,
                    createdAt: true,
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });

            return {
                message: 'Notification templates retrieved successfully',
                data: templates,
            };
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }

            throw new InternalServerErrorException('An error occurred while retrieving notification templates.');
        }
    }
}
