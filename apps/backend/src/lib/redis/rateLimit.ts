import type { Request, Response, NextFunction, RequestHandler } from 'express';

import { ERROR_CODES, severityFor } from '@shared/constants/error-codes.js';
import { resolveErrorMessage } from '@shared/constants/error-messages.js';

import { logger } from '../logger.js';

import { redis } from './client.js';

/**
 * Sliding-window counter over a Redis sorted set.
 *
 * The previous implementation was `INCR` plus an `EXPIRE` set only when the
 * counter first hit 1. Two problems, both of which users felt:
 *
 *  1. **Fixed window.** All requests in a window shared one expiry, so the
 *     allowance did not recover gradually — it vanished, then reappeared
 *     whole. Worse, a blocked caller kept incrementing a key whose TTL was
 *     never refreshed, so the count climbed while the clock ran down.
 *
 *  2. **No partial recovery.** Nine requests at 14:00 left you locked until
 *     14:15 even at 14:14, when eight of them were nearly a quarter-hour old.
 *
 * A sorted set fixes both: each request is a member scored by timestamp,
 * anything older than the window is dropped on every call, and the allowance
 * frees up continuously as individual requests age out.
 *
 * KEYS[1] = key
 * ARGV[1] = now (ms)          ARGV[2] = window (ms)
 * ARGV[3] = limit             ARGV[4] = unique member id
 *
 * Returns { count, oldestMs } — `oldestMs` is the age of the oldest request
 * still in the window, which is what `Retry-After` is derived from.
 */
const slidingWindowScript = `
local key      = KEYS[1]
local now      = tonumber(ARGV[1])
local window   = tonumber(ARGV[2])
local limit    = tonumber(ARGV[3])
local member   = ARGV[4]
local cutoff   = now - window

-- Drop everything that has aged out of the window.
redis.call('ZREMRANGEBYSCORE', key, '-inf', cutoff)

local count = redis.call('ZCARD', key)

if count < limit then
  -- Under the limit: record this request and allow it.
  redis.call('ZADD', key, now, member)
  count = count + 1
else
  -- At or over the limit: do NOT record. A rejected request must not extend
  -- the window — that was the old bug, where retrying while blocked pushed
  -- the unlock further away every time.
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local retry_after_ms = window
  if oldest[2] then
    retry_after_ms = (tonumber(oldest[2]) + window) - now
  end
  -- Keep the key alive exactly as long as the newest entry needs.
  redis.call('PEXPIRE', key, window)
  return { count, retry_after_ms, 0 }
end

-- TTL covers the whole window from the newest entry, so the key cleans
-- itself up once traffic stops.
redis.call('PEXPIRE', key, window)
return { count, 0, 1 }
`;

interface RateLimitOptions {
  /**
   * Distinguishes one limiter from another when several are keyed the same
   * way. Without it, every `ipRateLimit` on the app shares a single counter —
   * which is exactly what happened: login, password reset, registration, the
   * version check and in-call event reporting all incremented the same number,
   * so roughly six ordinary actions produced "too many attempts".
   */
  scope: string;
}

let warnedOnFailure = false;

export const rateLimitMiddleware =
  (
    keyFn: (req: Request) => string,
    limit: number,
    windowSeconds: number,
    options?: RateLimitOptions,
  ): RequestHandler =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // The route is part of the key. `req.route.path` is the *pattern*
    // (`/:id`), not the concrete URL, so a per-resource path cannot be used to
    // farm a fresh bucket per id.
    const scope = options?.scope ?? `${req.baseUrl}${req.route?.path ?? req.path}`;
    const key = `rl:${keyFn(req)}:${scope}`;

    const windowMs = windowSeconds * 1000;
    const now = Date.now();
    // Unique per request so two calls in the same millisecond both count —
    // a plain timestamp member would collide and silently undercount.
    const member = `${now}-${Math.random().toString(36).slice(2, 10)}`;

    let count: number;
    let retryAfterMs: number;
    let allowed: boolean;

    try {
      const result = (await redis.eval(
        slidingWindowScript,
        1,
        key,
        String(now),
        String(windowMs),
        String(limit),
        member,
      )) as [number, number, number];

      count = result[0];
      retryAfterMs = result[1];
      allowed = result[2] === 1;
    } catch (err: unknown) {
      // **Fail open.** Redis being unreachable must not lock every user out of
      // logging in. Logged once per process so an outage does not flood the
      // logs with one line per request.
      if (!warnedOnFailure) {
        warnedOnFailure = true;
        logger.error({ err }, 'rate limiter unavailable — allowing request');
      }
      next();
      return;
    }

    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - count));

    if (!allowed) {
      const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
      res.setHeader('Retry-After', retryAfterSeconds);
      res.setHeader('X-RateLimit-Reset', Math.ceil((now + retryAfterMs) / 1000));
      res.status(429).json({
        errorCode: severityFor(ERROR_CODES.RATE_LIMITED),
        errorMessage: resolveErrorMessage(ERROR_CODES.RATE_LIMITED),
        reason: ERROR_CODES.RATE_LIMITED,
      });
      return;
    }

    next();
  };

/**
 * Per-IP, **per-route** limiting.
 *
 * Pass [scope] to make several routes deliberately share one budget — the
 * forgot-password steps do this, so a caller cannot get 10 fresh attempts at
 * each step of the same flow.
 */
export const ipRateLimit = (
  limit: number,
  windowSeconds: number,
  scope?: string,
): RequestHandler =>
  rateLimitMiddleware(
    (req) => `ip:${req.ip ?? 'unknown'}`,
    limit,
    windowSeconds,
    scope ? { scope } : undefined,
  );
