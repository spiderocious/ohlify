// Patch all active OTPs (Redis + DB) to a known value: 123456.
// Use after `register/initiate`, `forgot-password/initiate`, `me/sensitive-action/otp`,
// `me/email`, or `me/phone` so the verify step can succeed deterministically in tests.

import crypto from 'node:crypto';

import { pool } from './db.mjs';
import { redis } from './redis.mjs';

const KNOWN = '123456';
const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex');
const KNOWN_HASH = sha256(KNOWN);

const REDIS_PATTERNS = [
  'otp:*',          // register tokens
  'sa-otp:*',       // sensitive-action OTPs
  'email-verify:*', // /me/email/verify
  'phone-verify:*', // /me/phone/verify
];

let redisCount = 0;
for (const p of REDIS_PATTERNS) {
  const keys = await redis.keys(p);
  for (const k of keys) {
    await redis.set(k, KNOWN_HASH, 'KEEPTTL');
    redisCount++;
  }
}

const db = await pool.query(
  `UPDATE otp_codes SET code_hash = $1
     WHERE consumed_at IS NULL AND expires_at > now()`,
  [KNOWN_HASH],
);

console.log(`patched ${redisCount} Redis keys + ${db.rowCount} DB rows to ${KNOWN}`);
await redis.quit();
await pool.end();
