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
import { ApiKeyService } from './api-key.service.js';
import { CreateApiKeyDto } from './dto/create-api-key.dto.js';
import { CurrentOrg } from '../common/decorators/current-org.decorator.js';
import type { OrganizationJwtPayload } from '../common/interfaces/jwt-payload.interface.js';


@Controller('api-keys')
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createKey(
    @CurrentOrg() org: OrganizationJwtPayload,
    @Body() dto: CreateApiKeyDto,
  ) {
    return await this.apiKeyService.createKey(org.sub, dto);
  }

  @Get()
  async listKeys(@CurrentOrg() org: OrganizationJwtPayload) {
    return await this.apiKeyService.listKeys(org.sub);
  }

  @Delete(':id')
  async revokeKey(
    @CurrentOrg() org: OrganizationJwtPayload,
    @Param('id') id: string,
  ) {
    return await this.apiKeyService.revokeKey(org.sub, id);
  }
}
