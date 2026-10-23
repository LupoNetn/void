import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { NotificationChannel } from '@prisma/client';
import { ProviderCredentialsService } from './provider-credentials.service.js';
import { CreateProviderDTO } from './dto/create-provider.dto.js';
import { CurrentOrg } from '../common/decorators/current-org.decorator.js';
import type { OrganizationJwtPayload } from '../common/interfaces/jwt-payload.interface.js';

@Controller('provider-credentials')
export class ProviderCredentialsController {
  constructor(private readonly providerCredentialsService: ProviderCredentialsService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async createOrUpdateCredential(
    @CurrentOrg() org: OrganizationJwtPayload,
    @Body() body: CreateProviderDTO,
  ) {
    return await this.providerCredentialsService.upsertCredential(org.sub, body);
  }

  @Get()
  async listCredentials(@CurrentOrg() org: OrganizationJwtPayload) {
    return await this.providerCredentialsService.listCredentials(org.sub);
  }

  @Delete(':channel')
  async deleteCredential(
    @CurrentOrg() org: OrganizationJwtPayload,
    @Param('channel') channel: NotificationChannel,
  ) {
    return await this.providerCredentialsService.deleteCredential(org.sub, channel);
  }
}
