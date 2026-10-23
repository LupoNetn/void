import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { ApiKeyService } from '../../api-key/api-key.service.js';
import type { OrganizationJwtPayload } from '../interfaces/jwt-payload.interface.js';

@Injectable()
export class NotificationAuthGuard implements CanActivate {
  constructor(private readonly apiKeys: ApiKeyService, private readonly jwt: JwtService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers['x-api-key'] as string | undefined;
    if (apiKey) { request.organization = await this.apiKeys.validateKey(apiKey); return true; }
    const bearer = request.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!bearer) throw new UnauthorizedException('Provide an x-api-key or Bearer access token.');
    try {
      request.organization = await this.jwt.verifyAsync<OrganizationJwtPayload>(bearer, { secret: process.env.JWT_ACCESS_SECRET || 'supersecretjwtkey' });
      return true;
    } catch { throw new UnauthorizedException('Invalid authentication credentials.'); }
  }
}
