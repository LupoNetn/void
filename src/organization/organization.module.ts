import { Module } from '@nestjs/common';
import { OrganizationService } from './organization.service.js';
import { OrganizationController } from './organization.controller.js';

@Module({
  providers: [OrganizationService],
  controllers: [OrganizationController]
})
export class OrganizationModule {}
