import { logger } from '@lib/logger.js';
import { redis } from '@lib/redis/client.js';

// Read-through Redis cache for read endpoints. On cache hit returns the parsed
// value. On miss runs the loader, caches the result for `ttlSeconds`, and
// returns it. Cache failures are non-fatal — the request still succeeds.
export const getOrCompute = async <T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> => {
  try {
    const cached = await redis.get(key);
    if (cached !== null) {
      return JSON.parse(cached) as T;
    }
  } catch (err) {
    logger.warn({ err, key }, 'response cache read failed; falling through to loader');
  }

  const value = await loader();

  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (err) {
    logger.warn({ err, key }, 'response cache write failed');
  }

  return value;
};

// Best-effort delete. Used by controllers that mutate cached resources.
export const invalidate = async (...keys: string[]): Promise<void> => {
  if (keys.length === 0) return;
  try {
    await redis.del(...keys);
  } catch (err) {
    logger.warn({ err, keys }, 'response cache invalidate failed');
  }
};
