import crypto from 'node:crypto';

import { env } from '../../env.js';

// Paystack signs every webhook body with HMAC-SHA512 using the merchant
// webhook secret. Header is `x-paystack-signature`. We compute the same HMAC
// over the raw body and compare via timingSafeEqual.
//
// The `rawBody` Buffer must be captured by `express.raw({ type: 'application/json' })`
// before any body parser touches it — JSON.stringify(parsedBody) does NOT
// reproduce Paystack's exact bytes (whitespace, key order, escape rules).
export const verifyPaystackSignature = (
  rawBody: Buffer,
  signatureHeader?: string,
  querySecretKey?: string,
): boolean => {
  // Local-only replay affordance: `?webhookKey=<secret>` lets the dev replay
  // tooling post an unsigned body. This is NEVER allowed in production — a
  // secret in a query string leaks through access logs, proxies, and browser
  // history, and accepting an unsigned body would let anyone who ever saw that
  // URL forge a wallet credit. In production the ONLY accepted auth is a valid
  // HMAC-SHA512 signature. (BUGS.md M2.)
  if (
    env.NODE_ENV !== 'production' &&
    querySecretKey &&
    querySecretKey === env.PAYSTACK_WEBHOOK_SECRET
  ) {
    return true;
  }
  if (typeof signatureHeader !== 'string' || signatureHeader.length === 0) {
    return false;
  }
  const expected = crypto
    .createHmac('sha512', env.PAYSTACK_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  if (expected.length !== signatureHeader.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
};
