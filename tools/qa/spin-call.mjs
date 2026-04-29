#!/usr/bin/env node
// Spins a ready-to-test call against a target backend and emits
// { call_id, channel, caller_jwt, callee_jwt, ... } on stdout.
//
// Reuses two long-lived smoke users (caller + callee). Creates them on
// first run; reuses them after that. State is kept in:
//
//   tools/qa/.spin-call-state.json
//
// (gitignored; per-target). The state file remembers user_ids + bank
// account so subsequent runs don't re-register.
//
// Workflow performed each invocation:
//
//   1. ensure caller + callee users exist for the target (register if not)
//   2. ensure pro has at least one active rate (audio 5min @ ₦10,000)
//   3. ensure pro has a verified bank account on file
//   4. admin-credit the caller wallet so it has > rate price
//   5. POST /bookings → grab call_id
//   6. backdate booking.start_at = now() and wait until call-starter cron
//      flips status to waiting_for_parties (so the call is joinable)
//   7. emit JSON to stdout
//
// Flags:
//
//   --base <url>          backend base URL. default: env OHLIFY_BASE_URL or
//                         http://localhost:8080
//   --admin-token <token> admin stub token. default: env ADMIN_STUB_TOKEN
//   --rate-id <id>        force a specific rate. default: pro's first active
//   --duration <minutes>  forced rate duration if creating one. default 5
//   --price <kobo>        forced rate price if creating one. default 1_000_000
//   --no-wait             skip the "wait for waiting_for_parties" step;
//                         emits as soon as booking is confirmed.
//   --json                output JSON only, no banner. default true if stdout
//                         is not a TTY.
//   --new-users           force-register fresh caller/callee with random
//                         emails (ignores cached state for this run).
//   --quiet               suppress all status output to stderr.
//   --pretty              human-readable output (call_id + 2 JWTs) instead
//                         of full JSON. Good for "give me the 3 things".
//
// Examples:
//
//   node tools/qa/spin-call.mjs
//   node tools/qa/spin-call.mjs --base https://api.ohlify.dev
//   node tools/qa/spin-call.mjs --new-users --quiet
//
// Stdout shape (machine-readable):
//
//   {
//     "base_url": "http://localhost:8080",
//     "caller": { "user_id": "u_...", "email": "...", "jwt": "ey..." },
//     "callee": { "user_id": "u_...", "email": "...", "jwt": "ey..." },
//     "booking_id": "bk_...",
//     "call_id": "c_...",
//     "channel": "call_c_...",
//     "rate_id": "rate_...",
//     "call_type": "audio",
//     "duration_minutes": 5,
//     "total_paid_kobo": 1000000,
//     "start_at": "2026-04-28T...",
//     "ready": true     // true if status reached waiting_for_parties before timeout
//   }

import { createHash, randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Reuse the existing connection helpers from sibling QA scripts so we don't
// need pg/ioredis at the workspace root.
import { pool as pgPoolLazy } from './db.mjs';
import { redis as redisLazy } from './redis.mjs';

// ── Setup ──────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = parseArgs(process.argv.slice(2));
const BASE = (args.base ?? process.env.OHLIFY_BASE_URL ?? 'http://localhost:8080').replace(/\/$/, '');
const API = `${BASE}/api/v1`;
const ADMIN_TOKEN = args['admin-token'] ?? process.env.ADMIN_STUB_TOKEN ?? readEnvFile().ADMIN_STUB_TOKEN;
const STATE_FILE = join(__dirname, '.spin-call-state.json');
const QUIET = !!args.quiet;
const FORCE_NEW_USERS = !!args['new-users'];
const SKIP_WAIT = !!args['no-wait'];

const log = (...m) => { if (!QUIET) console.error('[spin-call]', ...m); };

if (!ADMIN_TOKEN) {
  console.error('error: ADMIN_STUB_TOKEN not set (env or --admin-token)');
  process.exit(1);
}

// ── DB / Redis (only needed when registering new users — for OTP shortcut) ─
// Reuses the eager connections from db.mjs / redis.mjs.
const getPg = () => pgPoolLazy;
const getRedis = () => redisLazy;

// ── HTTP helpers ──────────────────────────────────────────────────────────

async function http(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    method: opts.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
      ...(opts.adminToken ? { 'x-admin-token': opts.adminToken } : {}),
      ...(opts.idemKey ? { 'idempotency-key': opts.idemKey } : {}),
      ...(opts.headers ?? {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { _raw: text }; }
  return { status: res.status, body };
}

// ── User registration (mirrors register-user.mjs but inline) ──────────────

const sha256hex = (v) => createHash('sha256').update(v).digest('hex');
const KNOWN_OTP_HASH = sha256hex('123456');

async function flushIpRateLimits() {
  try {
    const r = getRedis();
    const keys = await r.keys('rl:*');
    if (keys.length) await r.del(...keys);
  } catch (err) {
    // Non-fatal — only matters if rate limits actively block us
    log('warn: redis unreachable, skipping rate-limit flush');
  }
}

async function registerUser({ email, phone, password = 'Password123!' }) {
  await flushIpRateLimits();
  const r1 = await http('/auth/register/initiate', { method: 'POST', body: { email, phone, channel: 'email' } });
  if (!r1.body.data) throw new Error(`initiate: ${JSON.stringify(r1.body)}`);
  const token = r1.body.data.registration_token;

  await flushIpRateLimits();
  const r2 = await http('/auth/register/set-password', { method: 'POST', body: { registration_token: token, password } });
  if (r2.body.error) throw new Error(`set-password: ${JSON.stringify(r2.body)}`);

  // Patch OTP to a known value via DB + redis (only works against a target
  // where we have local access; remote targets need real OTP).
  const tokenHash = sha256hex(token);
  try {
    await getPg().query(
      "UPDATE otp_codes SET code_hash = $1 WHERE subject_key = $2 AND consumed_at IS NULL",
      [KNOWN_OTP_HASH, tokenHash],
    );
    await getRedis().set(`otp:${tokenHash}`, KNOWN_OTP_HASH, 'KEEPTTL');
  } catch (err) {
    log(`warn: OTP patch failed (${err.message}). If target is remote, fetch OTP from logs/email manually.`);
  }

  await flushIpRateLimits();
  const r3 = await http('/auth/register/verify', { method: 'POST', body: { registration_token: token, otp: '123456' } });
  if (!r3.body.data) throw new Error(`verify: ${JSON.stringify(r3.body)}`);

  return {
    user_id: r3.body.data.user.id,
    email: r3.body.data.user.email,
    access_token: r3.body.data.access_token,
    refresh_token: r3.body.data.refresh_token,
  };
}

async function login({ email, password = 'Password123!' }) {
  await flushIpRateLimits();
  const res = await http('/auth/login', { method: 'POST', body: { email, password } });
  if (!res.body.data) throw new Error(`login(${email}): ${JSON.stringify(res.body)}`);
  return res.body.data.access_token;
}

// ── Onboarding helpers ────────────────────────────────────────────────────

async function setRole(token, role) {
  const res = await http('/onboarding/role', { method: 'POST', token, body: { role } });
  if (res.status >= 400 && !String(res.body.error?.code).includes('already')) {
    log(`warn: setRole ${role}: ${JSON.stringify(res.body)}`);
  }
}

async function setHandle(token, handle) {
  const res = await http('/me/handle', { method: 'POST', token, body: { handle } });
  if (res.status >= 400 && !String(res.body.error?.code).includes('handle_taken')) {
    log(`warn: setHandle ${handle}: ${JSON.stringify(res.body)}`);
  }
}

async function setKyc(token) {
  // Minimum KYC pass — full name (already set during register), category, etc.
  const cats = await http('/professional-categories', { token });
  const catId = cats.body.data?.[0]?.id;
  if (catId) {
    await http('/onboarding/kyc/professional', {
      method: 'PATCH',
      token,
      body: { category_id: catId, bio: 'qa-spin-call autogen pro' },
    });
  }
}

// ── Pro setup: ensure rate + bank ─────────────────────────────────────────

async function ensureActiveRate(proToken, { duration, price }) {
  const got = await http('/me/rates', { token: proToken });
  const rates = got.body.data ?? [];
  const audio = rates.find((r) => r.call_type === 'audio' && !r.deleted_at);
  if (audio) return audio.id;
  const created = await http('/me/rates', {
    method: 'POST',
    token: proToken,
    body: { call_type: 'audio', duration_minutes: duration, price_kobo: price },
  });
  if (!created.body.data) throw new Error(`create-rate: ${JSON.stringify(created.body)}`);
  return created.body.data.id;
}

async function ensureBankAccount(proToken) {
  const got = await http('/me/bank-account', { token: proToken });
  if (got.body.data?.account_number) return;
  // Use Paystack test bank 001 + valid 0000000000 → "TEST ACCOUNT 0000000000"
  const resolve = await http(
    '/banks/resolve?account_number=0000000000&bank_code=001',
    { token: proToken },
  );
  if (!resolve.body.data) throw new Error(`bank resolve: ${JSON.stringify(resolve.body)}`);
  const set = await http('/me/bank-account', {
    method: 'PUT',
    token: proToken,
    body: {
      account_number: '0000000000',
      bank_code: '001',
      account_name: resolve.body.data.account_name,
    },
  });
  if (set.body.error) log(`warn: bank-account set: ${JSON.stringify(set.body)}`);
}

// ── Wallet credit ─────────────────────────────────────────────────────────

async function adminCredit({ user_id, amount_kobo }) {
  const res = await http('/admin/wallets/credit', {
    method: 'POST',
    adminToken: ADMIN_TOKEN,
    body: { user_id, amount_kobo, reason: 'qa-spin-call' },
  });
  if (res.status !== 201) throw new Error(`credit: ${JSON.stringify(res.body)}`);
}

// ── Booking ───────────────────────────────────────────────────────────────

async function cleanupStaleBookings({ callerToken, callerUserId, calleeUserId }) {
  // Clean up any prior spin-call bookings for this callee that haven't
  // reached a terminal status. Without this, the GiST exclusion fights us
  // when we book a fresh slot. Strategy:
  //   - If start_at is still in the future: cancel via API (refund flows)
  //   - If start_at has passed: admin force-end (resolves via no-show or
  //     stuck-call branch with proper journals)
  // Best-effort — silent on failures.
  try {
    const res = await getPg().query(
      `SELECT b.id AS booking_id, b.status::text AS booking_status, b.start_at,
              c.id AS call_id, c.status::text AS call_status
         FROM bookings b
    LEFT JOIN calls c ON c.booking_id = b.id
        WHERE b.callee_user_id = $1
          AND b.status IN ('pending', 'confirmed')`,
      [calleeUserId],
    );
    let cancelled = 0, forceEnded = 0;
    for (const row of res.rows) {
      const startMs = new Date(row.start_at).getTime();
      if (startMs > Date.now()) {
        // Cancel via API (only works if caller_token == this booking's caller)
        if (row.caller_user_id === callerUserId) {
          const r = await http(`/bookings/${row.booking_id}/cancel`, {
            method: 'POST',
            token: callerToken,
            body: { reason: 'qa-spin-call cleanup' },
          });
          if (r.status === 200) cancelled++;
        }
      } else if (row.call_id) {
        // Past start_at — force-end the call via admin to terminalize
        const r = await http(`/admin/calls/${row.call_id}/force-end`, {
          method: 'POST',
          adminToken: ADMIN_TOKEN,
        });
        if (r.status === 200) forceEnded++;
      }
    }
    if (cancelled || forceEnded) {
      log(`cleanup: cancelled=${cancelled} force-ended=${forceEnded}`);
    }
  } catch (err) {
    log(`warn: cleanup failed (${err.message}); continuing`);
  }
}

async function createBooking({ callerToken, callerUserId, calleeUserId, rateId }) {
  await cleanupStaleBookings({ callerToken, callerUserId, calleeUserId });
  // Schedule "right now" — we'll backdate immediately to make joinable.
  const startAt = new Date(Date.now() + 5 * 1000).toISOString();
  const res = await http('/bookings', {
    method: 'POST',
    token: callerToken,
    idemKey: `spin-call-${Date.now()}-${randomBytes(4).toString('hex')}`,
    body: { callee_user_id: calleeUserId, rate_id: rateId, start_at: startAt },
  });
  if (!res.body.data) throw new Error(`book: ${JSON.stringify(res.body)}`);
  return res.body.data;
}

async function backdateBooking(bookingId) {
  // Direct DB write — only works for local targets. For remote, the call-
  // starter cron will eventually flip the status, but the user might wait.
  try {
    await getPg().query("UPDATE bookings SET start_at = now() WHERE id = $1", [bookingId]);
    return true;
  } catch (err) {
    log(`warn: cannot backdate booking on remote target (${err.message}); call will become joinable when start_at arrives`);
    return false;
  }
}

async function waitForJoinable(callId, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await getPg().query("SELECT status::text AS s FROM calls WHERE id = $1", [callId]);
      const s = r.rows[0]?.s;
      if (s === 'waiting_for_parties' || s === 'in_progress') return s;
    } catch {
      // Remote target — fall through to GET
    }
    await new Promise((r) => setTimeout(r, 2_000));
  }
  return null;
}

// ── State file ────────────────────────────────────────────────────────────

function loadState() {
  if (!existsSync(STATE_FILE)) return {};
  try { return JSON.parse(readFileSync(STATE_FILE, 'utf8')); } catch { return {}; }
}
function saveState(s) {
  writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
}

// ── Args parser (no deps) ─────────────────────────────────────────────────

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const k = a.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) { out[k] = next; i++; }
    else out[k] = true;
  }
  return out;
}

function readEnvFile() {
  try {
    const p = join(__dirname, '..', '..', 'apps', 'backend', '.env');
    if (!existsSync(p)) return {};
    const out = {};
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m) out[m[1]] = m[2];
    }
    return out;
  } catch { return {}; }
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const targetKey = BASE; // state is keyed by base URL so dev vs prod don't mix
  const state = loadState();
  let cached = FORCE_NEW_USERS ? null : state[targetKey];

  // 1. Ensure caller + callee users
  let caller, callee;
  if (cached?.caller_email && cached?.callee_email) {
    log(`reusing cached users for ${targetKey}`);
    try {
      const callerJwt = await login({ email: cached.caller_email });
      const calleeJwt = await login({ email: cached.callee_email });
      caller = { user_id: cached.caller_user_id, email: cached.caller_email, access_token: callerJwt };
      callee = { user_id: cached.callee_user_id, email: cached.callee_email, access_token: calleeJwt };
    } catch (err) {
      log(`cached login failed (${err.message}); registering new users`);
      cached = null;
    }
  }

  if (!caller) {
    const stamp = Date.now().toString(36);
    const callerEmail = `qa-call-${stamp}-cli@regression.dev`;
    const calleeEmail = `qa-call-${stamp}-pro@regression.dev`;
    const callerPhone = `+234801${String(Math.floor(Math.random() * 10000000)).padStart(7, '0')}`;
    const calleePhone = `+234801${String(Math.floor(Math.random() * 10000000)).padStart(7, '0')}`;

    log(`registering caller ${callerEmail}`);
    caller = await registerUser({ email: callerEmail, phone: callerPhone });
    await setRole(caller.access_token, 'client');
    await setHandle(caller.access_token, `cli${stamp.slice(-6)}`);

    log(`registering callee ${calleeEmail}`);
    callee = await registerUser({ email: calleeEmail, phone: calleePhone });
    await setRole(callee.access_token, 'professional');
    await setHandle(callee.access_token, `pro${stamp.slice(-6)}`);
    await setKyc(callee.access_token);

    state[targetKey] = {
      caller_user_id: caller.user_id, caller_email: caller.email,
      callee_user_id: callee.user_id, callee_email: callee.email,
    };
    saveState(state);
  }

  // 2. Ensure pro has rate + bank account
  log('ensuring pro rate + bank');
  const rateId = args['rate-id'] ?? await ensureActiveRate(callee.access_token, {
    duration: parseInt(args.duration ?? '5', 10),
    price: parseInt(args.price ?? '1000000', 10),
  });
  await ensureBankAccount(callee.access_token);

  // 3. Top up caller wallet (idempotent — costs nothing if already funded)
  log('topping up caller wallet');
  await adminCredit({ user_id: caller.user_id, amount_kobo: 5_000_000 });

  // 4. Book
  log('creating booking');
  const booking = await createBooking({
    callerToken: caller.access_token,
    callerUserId: caller.user_id,
    calleeUserId: callee.user_id,
    rateId,
  });
  const callId = booking.call_id;
  log(`booking=${booking.id} call=${callId}`);

  // 5. Backdate + wait for joinable (local target only)
  let ready = false;
  if (!SKIP_WAIT) {
    log('backdating start_at + waiting for waiting_for_parties (~30s for cron)');
    const backdated = await backdateBooking(booking.id);
    if (backdated) {
      const status = await waitForJoinable(callId, 90_000);
      ready = status !== null;
      log(ready ? `ready: status=${status}` : 'timed out waiting for joinable status');
    }
  }

  // 6. Emit
  const out = {
    base_url: BASE,
    caller: { user_id: caller.user_id, email: caller.email, jwt: caller.access_token },
    callee: { user_id: callee.user_id, email: callee.email, jwt: callee.access_token },
    booking_id: booking.id,
    call_id: callId,
    channel: `call_${callId}`,
    rate_id: rateId,
    call_type: booking.call_type,
    duration_minutes: booking.duration_minutes,
    total_paid_kobo: booking.total_paid_kobo,
    start_at: booking.start_at,
    ready,
  };

  if (args.pretty) {
    // Compact human-readable output for "I just need to paste 3 things"
    console.log('');
    console.log(`call_id:    ${callId}`);
    console.log(`channel:    call_${callId}`);
    console.log(`status:     ${ready ? 'waiting_for_parties (joinable)' : 'scheduled (waiting for cron — ~30s)'}`);
    console.log(`booking:    ${booking.id}  (${booking.call_type}, ${booking.duration_minutes}min, ₦${(booking.total_paid_kobo / 100).toLocaleString()})`);
    console.log('');
    console.log('--- caller JWT ---');
    console.log(caller.access_token);
    console.log('');
    console.log('--- callee JWT ---');
    console.log(callee.access_token);
    console.log('');
  } else {
    console.log(JSON.stringify(out, null, 2));
  }
}

main()
  .then(async () => {
    try { await getPg().end(); } catch {}
    try { await getRedis().quit(); } catch {}
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('error:', err.message);
    try { await getPg().end(); } catch {}
    try { await getRedis().quit(); } catch {}
    process.exit(1);
  });
