import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { OrganizationModule } from './organization/organization.module.js';

@Module({
  imports: [PrismaModule, OrganizationModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

