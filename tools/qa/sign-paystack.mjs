// Emit HMAC-SHA512 signature for a Paystack webhook body, using
// PAYSTACK_WEBHOOK_SECRET from .env. Used by webhook end-to-end tests so we
// don't need actual Paystack callbacks.
//
// Usage:
//   node tools/qa/sign-paystack.mjs '<json-body>'
//   echo '<json-body>' | node tools/qa/sign-paystack.mjs
//
// Stdout: just the hex digest (suitable for `-H "x-paystack-signature: ..."`).

import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';

const readSecret = () => {
  const env = readFileSync('/Users/feranmi/codebases/2026/ohlify/backend/apps/backend/.env', 'utf8');
  const m = /^PAYSTACK_WEBHOOK_SECRET=(.+)$/m.exec(env);
  if (!m) throw new Error('PAYSTACK_WEBHOOK_SECRET not found in .env');
  return m[1].trim();
};

const body =
  process.argv[2] ??
  (await new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  }));

const sig = crypto.createHmac('sha512', readSecret()).update(body).digest('hex');
process.stdout.write(sig);
