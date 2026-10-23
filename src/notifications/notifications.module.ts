import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';
import { DispatchService } from './dispatch.service.js';
import { ProviderCredentialsModule } from '../provider-credentials/provider-credentials.module.js';
import { ApiKeyModule } from '../api-key/api-key.module.js';
import { NotificationAuthGuard } from '../common/guards/notification-auth.guard.js';

@Module({
  imports: [ProviderCredentialsModule, ApiKeyModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, DispatchService, NotificationAuthGuard],
  exports: [DispatchService],
})
export class NotificationsModule {}
