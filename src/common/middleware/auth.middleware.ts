import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request, Response, NextFunction } from 'express';
import { OrganizationJwtPayload } from '../interfaces/jwt-payload.interface.js';

// Extend Express Request interface to include organization
declare global {
  namespace Express {
    interface Request {
      organization?: OrganizationJwtPayload;
    }
  }
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly jwtService: JwtService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    let token: string | undefined;

    // 1. Check for token in Authorization header (Bearer <token>)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    // 2. Fallback to reading token from cookies
    if (!token && req.cookies) {
      token = req.cookies['accessToken'] || req.cookies['token'];
    }

    if (!token) {
      throw new UnauthorizedException('Authentication token is missing.');
    }

    try {
      const payload: OrganizationJwtPayload = await this.jwtService.verifyAsync(
        token,
        {
          secret: process.env.JWT_ACCESS_SECRET || 'supersecretjwtkey',
        },
      );

      req.organization = payload;

      next();
    } catch {
      throw new UnauthorizedException('Invalid or expired authentication token.');
    }
  }
}
