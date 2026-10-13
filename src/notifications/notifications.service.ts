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
