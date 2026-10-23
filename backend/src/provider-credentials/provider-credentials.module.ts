import { Module } from '@nestjs/common';
import { ProviderCredentialsService } from './provider-credentials.service.js';
import { ProviderCredentialsController } from './provider-credentials.controller.js';

@Module({
  providers: [ProviderCredentialsService],
  controllers: [ProviderCredentialsController],
  exports: [ProviderCredentialsService],
})
export class ProviderCredentialsModule {}
