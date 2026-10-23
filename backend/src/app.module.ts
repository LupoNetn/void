import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { OrganizationModule } from './organization/organization.module.js';
import { ApiKeyModule } from './api-key/api-key.module.js';
import { AuthMiddleware } from './common/middleware/auth.middleware.js';
import { ProviderCredentialsModule } from './provider-credentials/provider-credentials.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { WebhooksModule } from './webhooks/webhooks.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'supersecretjwtkey',
    }),
    PrismaModule,
    OrganizationModule,
    ApiKeyModule,
    ProviderCredentialsModule,
    NotificationsModule,
    WebhooksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply AuthMiddleware to routes requiring authentication
    consumer
      .apply(AuthMiddleware)
      .exclude(
        { path: 'organization', method: RequestMethod.POST },
        { path: 'organization/login', method: RequestMethod.POST },
        { path: 'organization/refresh', method: RequestMethod.POST },
        { path: 'webhooks/providers/:provider', method: RequestMethod.POST },
        { path: 'notifications/send', method: RequestMethod.POST },
      )
      .forRoutes('organization/me', 'organization/logout', 'api-keys', 'provider-credentials', 'notifications', 'webhooks');
  }
}
