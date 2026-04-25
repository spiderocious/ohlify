import { redis } from './client.js';

const PREFIX = 'idempotency:';
const DEFAULT_TTL_SECONDS = 86_400; // 24h

export const getIdempotencyResult = async (key: string): Promise<string | null> =>
  redis.get(`${PREFIX}${key}`);

export const setIdempotencyResult = async (
  key: string,
  value: string,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): Promise<void> => {
  await redis.set(`${PREFIX}${key}`, value, 'EX', ttlSeconds);
};
