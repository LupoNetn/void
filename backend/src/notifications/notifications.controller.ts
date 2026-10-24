import {
    Controller,
    HttpCode,
    HttpStatus,
    Post,
    Get,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    Headers,
    UseGuards,
    ParseUUIDPipe,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { CreateNotificationTemplate } from './dto/create-template.dto.js';
import { UpdateNotificationTemplateDto } from './dto/update-template.dto.js';
import { QueryNotificationTemplateDto } from './dto/query-template.dto.js';
import { CurrentOrg } from '../common/decorators/current-org.decorator.js';
import type { OrganizationJwtPayload } from '../common/interfaces/jwt-payload.interface.js';
import { SendNotificationDTO } from './dto/send-notification.dto.js';
import { QueryNotificationsDto } from './dto/query-notifications.dto.js';
import { NotificationAuthGuard } from '../common/guards/notification-auth.guard.js';

@Controller('notifications')
export class NotificationsController {
    constructor(private readonly notificationService: NotificationsService) { }

    @Post('send')
    @UseGuards(NotificationAuthGuard)
    @HttpCode(HttpStatus.ACCEPTED)
    async send(@Body() dto: SendNotificationDTO, @CurrentOrg() org: OrganizationJwtPayload, @Headers('idempotency-key') key?: string) {
        return this.notificationService.send(org.sub, dto, key);
    }

    @Get()
    async list(@Query() query: QueryNotificationsDto, @CurrentOrg() org: OrganizationJwtPayload) {
        return this.notificationService.list(org.sub, query);
    }

    @Get('stats')
    async stats(@CurrentOrg() org: OrganizationJwtPayload) { return this.notificationService.stats(org.sub); }

    @Post('templates')
    @HttpCode(HttpStatus.CREATED)
    async createTemplate(
        @Body() templateDto: CreateNotificationTemplate,
        @CurrentOrg() org: OrganizationJwtPayload,
    ) {
        return this.notificationService.createTemplate(org.sub, templateDto);
    }


    @Get('templates')
    @HttpCode(HttpStatus.OK)
    async listTemplates(
        @Query() query: QueryNotificationTemplateDto,
        @CurrentOrg() org: OrganizationJwtPayload,
    ) {
        return this.notificationService.listTemplates(org.sub, query);
    }



    @Get('templates/slug/:slug')
    @HttpCode(HttpStatus.OK)
    async getTemplateBySlug(
        @Param('slug') slug: string,
        @Query('version') version: string | undefined,
        @CurrentOrg() org: OrganizationJwtPayload,
    ) {
        const parsedVersion = version ? parseInt(version, 10) : undefined;
        return this.notificationService.getTemplateBySlug(org.sub, slug, parsedVersion);
    }

    @Get('templates/:id')
    @HttpCode(HttpStatus.OK)
    async getTemplate(
        @Param('id') id: string,
        @CurrentOrg() org: OrganizationJwtPayload,
    ) {
        return this.notificationService.getTemplateById(org.sub, id);
    }

    @Patch('templates/:id')
    @HttpCode(HttpStatus.OK)
    async updateTemplate(
        @Param('id') id: string,
        @Body() updateDto: UpdateNotificationTemplateDto,
        @CurrentOrg() org: OrganizationJwtPayload,
    ) {
        return this.notificationService.updateTemplate(org.sub, id, updateDto);
    }

    @Delete('templates/:id')
    @HttpCode(HttpStatus.OK)
    async deleteTemplate(
        @Param('id') id: string,
        @CurrentOrg() org: OrganizationJwtPayload,
    ) {
        return this.notificationService.deleteTemplate(org.sub, id);
    }

    // Dynamic notification routes must remain after all /templates routes.
    @Get(':id')
    async get(
        @Param('id', new ParseUUIDPipe()) id: string,
        @CurrentOrg() org: OrganizationJwtPayload,
    ) {
        return this.notificationService.get(org.sub, id);
    }

    @Post(':id/cancel')
    async cancel(
        @Param('id', new ParseUUIDPipe()) id: string,
        @CurrentOrg() org: OrganizationJwtPayload,
    ) {
        return this.notificationService.cancel(org.sub, id);
    }
}
