import crypto from 'node:crypto';
import { redis } from '@lib/redis/client.js';
import { env } from '../../env.js';

const sha256 = (value: string): string => crypto.createHash('sha256').update(value).digest('hex');

// Generates a cryptographically-random 6-digit OTP string.
export const generateOtp = (): string => String(crypto.randomInt(100000, 1000000));

// Writes an OTP to Redis under the given key. Returns the plaintext code to
// send to the user. The stored value is sha256(code) — never the raw code.
export const createOtp = async (key: string, ttlSeconds: number): Promise<string> => {
  let code = generateOtp();
  if (env.USE_DEFAULT_OTP && env.DEFAULT_OTP) {
    code = env.DEFAULT_OTP;
  }
  await redis.setex(key, ttlSeconds, sha256(code));
  return code;
};

// Verifies an OTP against the Redis key. Deletes the key on success (single-use).
// Returns true on match, false on mismatch or missing key.
export const verifyOtp = async (key: string, code: string): Promise<boolean> => {
  const storedHash = await redis.get(key);
  if (!storedHash) return false;
  const providedHash = sha256(code);
  if (storedHash.length !== providedHash.length) return false;
  const valid = crypto.timingSafeEqual(Buffer.from(storedHash), Buffer.from(providedHash));
  if (valid) await redis.del(key);
  return valid;
};
