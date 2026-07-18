// Minimal register helper that works with USE_DEFAULT_OTP=true (OTP always 123456).
// Skips the dead otp_codes DB write in register-user.mjs. Emits JSON on stdout.
// Usage: node tools/qa/reg.mjs <email> <phone> [password=Password123!]
import { redis } from './redis.mjs';

const BASE = process.env.OHLIFY_BASE_URL ?? 'http://localhost:8082/api/v1';
const email = process.argv[2];
const phone = process.argv[3];
const password = process.argv[4] ?? 'Password123!';
if (!email || !phone) { console.error('Usage: reg.mjs <email> <phone> [password]'); process.exit(1); }

const flushRl = async () => { const k = await redis.keys('rl:*'); if (k.length) await redis.del(...k); };
const json = async (path, body) => {
  const res = await fetch(`${BASE}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { status: res.status, body: await res.json().catch(() => ({})) };
};

await flushRl();
const r1 = await json('/auth/register/initiate', { email, phone, channel: 'email' });
if (!r1.body.data) { console.error('initiate failed:', JSON.stringify(r1)); process.exit(1); }
const token = r1.body.data.registration_token;
await flushRl();
const r2 = await json('/auth/register/set-password', { registration_token: token, password });
if (r2.body.errorCode) { console.error('set-password failed:', JSON.stringify(r2)); process.exit(1); }
await flushRl();
const r3 = await json('/auth/register/verify', { registration_token: token, otp: '123456' });
if (!r3.body.data) { console.error('verify failed:', JSON.stringify(r3)); process.exit(1); }
const d = r3.body.data;
const out = {
  user_id: d.user?.id ?? d.user_id,
  email,
  phone,
  access_token: d.tokens?.accessToken ?? d.access_token ?? d.accessToken,
  refresh_token: d.tokens?.refreshToken ?? d.refresh_token ?? d.refreshToken,
};
console.log(JSON.stringify(out));
await redis.quit();
process.exit(0);
