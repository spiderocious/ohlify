// Build, sign, and POST a synthetic Paystack webhook to localhost.
// Drives end-to-end funding tests without needing a real Paystack callback.
//
// Usage:
//   node tools/qa/post-webhook.mjs charge.success <reference> <amount_kobo> [<fees_kobo>] [<data_id>]
//   node tools/qa/post-webhook.mjs charge.failed  <reference> <amount_kobo> [<fees_kobo>] [<data_id>]
//   node tools/qa/post-webhook.mjs --raw '<json>'      # send arbitrary body, signed
//
// Prints: HTTP status + response body (one JSON line).

import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';

const SECRET = (() => {
  const env = readFileSync('/Users/feranmi/codebases/2026/ohlify/backend/apps/backend/.env', 'utf8');
  const m = /^PAYSTACK_WEBHOOK_SECRET=(.+)$/m.exec(env);
  if (!m) throw new Error('PAYSTACK_WEBHOOK_SECRET not found in .env');
  return m[1].trim();
})();

const BASE = process.env.OHLIFY_BASE_URL ?? 'http://localhost:8080';
const URL = `${BASE}/api/v1/webhooks/paystack`;

const buildBody = () => {
  if (process.argv[2] === '--raw') return process.argv[3];
  const eventType = process.argv[2];
  const reference = process.argv[3];
  const amount = Number(process.argv[4]);
  const fees = process.argv[5] !== undefined ? Number(process.argv[5]) : 0;
  const id = process.argv[6] ?? `evt_${crypto.randomBytes(8).toString('hex')}`;
  if (!eventType || !reference || Number.isNaN(amount)) {
    console.error(
      'Usage:\n  node tools/qa/post-webhook.mjs charge.success <reference> <amount_kobo> [<fees>] [<data_id>]\n  node tools/qa/post-webhook.mjs --raw \'<json>\'',
    );
    process.exit(1);
  }
  const data = {
    id,
    reference,
    amount,
    currency: 'NGN',
    status: eventType === 'charge.success' ? 'success' : 'failed',
    fees,
    channel: 'card',
    paid_at: new Date().toISOString(),
  };
  return JSON.stringify({ event: eventType, data });
};

const body = buildBody();
const signature = crypto.createHmac('sha512', SECRET).update(body).digest('hex');

const res = await fetch(URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-paystack-signature': signature,
  },
  body,
});
const text = await res.text();
console.log(JSON.stringify({ status: res.status, body: text }));
