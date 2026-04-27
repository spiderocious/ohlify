// Register a user end-to-end: initiate → set-password → patch OTP → verify.
// Emits {user_id, email, access_token, refresh_token} on stdout.
//
// Usage:
//   node tools/qa/register-user.mjs <email> <phone> [password=Password123!]
//
// Side-effects: creates a user row + auth_session row + flushes IP rate-limit keys.

import crypto from 'node:crypto';

import { pool } from './db.mjs';
import { redis } from './redis.mjs';

const BASE = process.env.OHLIFY_BASE_URL ?? 'http://localhost:8080/api/v1';

const email = process.argv[2];
const phone = process.argv[3];
const password = process.argv[4] ?? 'Password123!';
if (!email || !phone) {
  console.error('Usage: node tools/qa/register-user.mjs <email> <phone> [password]');
  process.exit(1);
}

const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex');
const KNOWN_HASH = sha256('123456');

const flushRl = async () => {
  const keys = await redis.keys('rl:*');
  if (keys.length) await redis.del(...keys);
};

const json = async (path, opts = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? 'POST',
    headers: { 'content-type': 'application/json' },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  return res.json();
};

await flushRl();
const r1 = await json('/auth/register/initiate', { body: { email, phone, channel: 'email' } });
if (!r1.data) {
  console.error('initiate failed:', r1);
  process.exit(1);
}
const token = r1.data.registration_token;

await flushRl();
const r2 = await json('/auth/register/set-password', { body: { registration_token: token, password } });
if (r2.error) {
  console.error('set-password failed:', r2);
  process.exit(1);
}

const tokenHash = sha256(token);
await redis.set(`otp:${tokenHash}`, KNOWN_HASH, 'KEEPTTL');
await pool.query(
  "UPDATE otp_codes SET code_hash = $1 WHERE subject_key = $2 AND consumed_at IS NULL",
  [KNOWN_HASH, tokenHash],
);

await flushRl();
const r3 = await json('/auth/register/verify', { body: { registration_token: token, otp: '123456' } });
if (!r3.data) {
  console.error('verify failed:', r3);
  process.exit(1);
}

console.log(JSON.stringify({
  user_id: r3.data.user.id,
  email: r3.data.user.email,
  access_token: r3.data.access_token,
  refresh_token: r3.data.refresh_token,
}));

await redis.quit();
await pool.end();
