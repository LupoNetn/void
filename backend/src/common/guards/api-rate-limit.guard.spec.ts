import { describe, expect, it } from 'vitest';
import { ApiRateLimitGuard } from './api-rate-limit.guard.js';

describe('ApiRateLimitGuard', () => {
  it('rejects requests above the configured per-minute limit', () => {
    process.env.API_RATE_LIMIT_PER_MINUTE = '1';
    const headers: Record<string, unknown> = {};
    const context = { switchToHttp: () => ({ getRequest: () => ({ organization: { sub: 'org' } }), getResponse: () => ({ setHeader: (key: string, value: unknown) => { headers[key] = value; } }) }) } as never;
    const guard = new ApiRateLimitGuard();
    expect(guard.canActivate(context)).toBe(true);
    expect(() => guard.canActivate(context)).toThrow('API rate limit exceeded.');
    expect(headers['RateLimit-Limit']).toBe(1);
    delete process.env.API_RATE_LIMIT_PER_MINUTE;
  });
});
