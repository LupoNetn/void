import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiKeyService } from '../../api-key/api-key.service.js';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    let apiKey = request.headers['x-api-key'] as string | undefined;

    if (!apiKey) {
      const authHeader = request.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer vod_')) {
        apiKey = authHeader.split(' ')[1];
      }
    }

    if (!apiKey) {
      throw new UnauthorizedException('API Key missing. Provide x-api-key header or Bearer token.');
    }

    const organization = await this.apiKeyService.validateKey(apiKey);

    
    request.organization = organization;

    return true;
  }
}
