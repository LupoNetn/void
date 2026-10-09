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
      token = req.cookies['token'] || req.cookies['auth_token'];
    }

    if (!token) {
      throw new UnauthorizedException('Authentication token is missing.');
    }

    try {
      const payload: OrganizationJwtPayload = await this.jwtService.verifyAsync(
        token,
        {
          secret: process.env.JWT_SECRET || 'supersecretjwtkey',
        },
      );

      // Store decoded organization details / token in cookies for subsequent requests
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Optionally store a non-sensitive client-readable cookie of organization info
      res.cookie(
        'org_info',
        JSON.stringify({
          id: payload.sub,
          name: payload.name,
          email: payload.email,
          slug: payload.slug,
        }),
        {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        },
      );

      // Attach organization payload to request object
      req.organization = payload;

      next();
    } catch {
      throw new UnauthorizedException('Invalid or expired authentication token.');
    }
  }
}
