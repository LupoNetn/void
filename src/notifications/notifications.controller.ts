import { Controller, HttpCode, HttpStatus, Post, Get, Body } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { CreateNotificationTemplate } from './dto/create-template.dto.js';
import { CurrentOrg } from '../common/decorators/current-org.decorator.js';
import type { OrganizationJwtPayload } from '../common/interfaces/jwt-payload.interface.js';

@Controller('notifications')
export class NotificationsController {
    constructor(private readonly notificationService: NotificationsService) { }

    @Post('create-template')
    @HttpCode(HttpStatus.CREATED)
    async createNotificationTemplate(
        @Body() templateDto: CreateNotificationTemplate,
        @CurrentOrg() org: OrganizationJwtPayload
    ) {
        return this.notificationService.createTemplate(org.sub, templateDto);
    }

    @Get('list-templates')
    @HttpCode(HttpStatus.OK)
    async listTemplates(@CurrentOrg() org: OrganizationJwtPayload) {
        return this.notificationService.listTemplates(org.sub);
    }
}
