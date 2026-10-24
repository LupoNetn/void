import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';

type Bucket = { count: number; resetAt: number };

@Injectable()
export class ApiRateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const limit = Math.max(1, Number(process.env.API_RATE_LIMIT_PER_MINUTE ?? 120));
    const now = Date.now();
    const identity = request.organization?.sub ?? request.ip ?? 'anonymous';
    const current = this.buckets.get(identity);
    const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + 60_000 } : current;
    bucket.count += 1;
    this.buckets.set(identity, bucket);
    response.setHeader('RateLimit-Limit', limit);
    response.setHeader('RateLimit-Remaining', Math.max(0, limit - bucket.count));
    response.setHeader('RateLimit-Reset', Math.ceil(bucket.resetAt / 1000));
    if (bucket.count > limit) {
      response.setHeader('Retry-After', Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)));
      throw new HttpException('API rate limit exceeded.', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (this.buckets.size > 10_000) for (const [key, value] of this.buckets) if (value.resetAt <= now) this.buckets.delete(key);
    return true;
  }
}
