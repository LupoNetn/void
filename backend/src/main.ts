import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';

async function bootstrap() {
  if (process.env.NODE_ENV === 'production') {
    const required = ['DATABASE_URL', 'DIRECT_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'ENCRYPTION_SECRET', 'CORS_ORIGINS'];
    const missing = required.filter(name => !process.env[name] || process.env[name]!.startsWith('replace-with'));
    if (missing.length) throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
    for (const name of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'ENCRYPTION_SECRET']) {
      if (process.env[name]!.length < 32) throw new Error(`${name} must contain at least 32 characters.`);
    }
  }
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.use((_req: unknown, res: { setHeader: (name: string, value: string) => void }, next: () => void) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (process.env.NODE_ENV === 'production') res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });
  const origins = process.env.CORS_ORIGINS?.split(',').map(value => value.trim()).filter(Boolean);
  app.enableCors({
    origin: origins?.length ? origins : process.env.NODE_ENV === 'production' ? false : true,
    credentials: true,
  });
  app.enableShutdownHooks();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
await bootstrap();
