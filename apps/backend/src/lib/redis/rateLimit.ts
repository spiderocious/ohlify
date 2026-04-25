import type { Request, Response, NextFunction, RequestHandler } from 'express';

import { redis } from './client.js';

// Atomically increment and set expiry in one round-trip.
// KEYS[1] = key, ARGV[1] = windowSeconds
const incrWithTtlScript = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return current
`;

export const rateLimitMiddleware =
  (keyFn: (req: Request) => string, limit: number, windowSeconds: number): RequestHandler =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = `rl:${keyFn(req)}`;

    const current = (await redis.eval(incrWithTtlScript, 1, key, String(windowSeconds))) as number;

    const remaining = Math.max(0, limit - current);

    res.setHeader('X-RateLimit-Remaining', remaining);

    if (current > limit) {
      const ttl = await redis.ttl(key);
      res.setHeader('Retry-After', ttl > 0 ? ttl : windowSeconds);
      res.status(429).json({
        error: { code: 'rate_limited', message: 'Too many requests, please try again later' },
      });
      return;
    }

    next();
  };

export const ipRateLimit = (limit: number, windowSeconds: number): RequestHandler =>
  rateLimitMiddleware((req) => `ip:${req.ip ?? 'unknown'}`, limit, windowSeconds);
