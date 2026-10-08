import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { OrganizationService } from './organization.service.js';
import { CreateOrganizationDto } from './dto/create-org.dto.js';

@Controller('organization')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrganization(@Body() dto: CreateOrganizationDto) {
    return await this.organizationService.createOrg(dto);
  }
}

