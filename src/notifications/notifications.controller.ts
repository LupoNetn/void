import { Controller, Post, Body, Param, Get } from '@nestjs/common';
import { NotificationsService, CreateUserDto, CreateTemplateDto, SendNotificationDto } from './notifications.service.js';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('users')
  async createUser(@Body() dto: CreateUserDto) {
    return this.notificationsService.upsertUser(dto);
  }

  @Post('templates')
  async createTemplate(@Body() dto: CreateTemplateDto) {
    return this.notificationsService.createTemplate(dto);
  }

  @Post('send')
  async sendNotification(@Body() dto: SendNotificationDto) {
    if (dto.idempotencyKey) {
      return this.notificationsService.processWithIdempotency(
        dto.idempotencyKey,
        JSON.stringify(dto),
        3600,
        () => this.notificationsService.sendNotification(dto)
      );
    }
    return this.notificationsService.sendNotification(dto);
  }
}
