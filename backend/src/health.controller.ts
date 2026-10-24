import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  live() { return { status: 'ok', timestamp: new Date().toISOString() }; }

  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready', database: 'connected', timestamp: new Date().toISOString() };
    } catch {
      throw new ServiceUnavailableException('Database is unavailable.');
    }
  }
}
