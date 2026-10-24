import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { CurrentOrg } from '../common/decorators/current-org.decorator.js';
import type { OrganizationJwtPayload } from '../common/interfaces/jwt-payload.interface.js';
import { CreateWebhookDto } from './dto/webhook.dto.js';
import { WebhooksService } from './webhooks.service.js';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly service: WebhooksService) {}
  @Get() list(@CurrentOrg() org: OrganizationJwtPayload) { return this.service.list(org.sub); }
  @Post() create(@CurrentOrg() org: OrganizationJwtPayload, @Body() dto: CreateWebhookDto) { return this.service.create(org.sub, dto.url, dto.secret, dto.active); }
  @Delete(':id') remove(@CurrentOrg() org: OrganizationJwtPayload, @Param('id') id: string) { return this.service.remove(org.sub, id); }
}
