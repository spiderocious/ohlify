// Flush all rate-limit + login + sa-otp-rate + per-feature buckets.
// Does NOT touch active OTPs in Redis (use patch-otps.mjs for that).
// Does NOT touch otp_codes table.

import { redis } from './redis.mjs';

const PATTERNS = [
  'rl:*',                    // generic rate-limit middleware
  'login-*',                 // login-ip, login-email
  'account-locked:*',
  'resend:*',
  'sa-otp-rate:*',
  'rate-create:*',           // /me/rates POST bucket
  'rate-mutate:*',           // /me/rates PATCH+DELETE bucket
  'bank-resolve-min:*',      // /banks/resolve 30/min
  'bank-resolve-hour:*',     // /banks/resolve 100/hour
  'bank-resolve:*',          // /banks/resolve positive+negative cache
  'handle:check:*',          // handle availability cache
  'handle-check:*',          // handle/check per-user RL
];

let total = 0;
for (const pattern of PATTERNS) {
  const keys = await redis.keys(pattern);
  if (keys.length) {
    await redis.del(...keys);
    total += keys.length;
  }
}
console.log(`flushed ${total} keys`);
await redis.quit();
