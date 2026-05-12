// Posts a `call_settlement` journal so QA can drive the post-settle clawback
// path of refund approval. §8 (calls) hasn't shipped, so this is the only way
// to make a settlement journal exist for testing.
//
// The journal looks like:
//   pending_debits_pool  -gross         (releasing what was reserved)
//   payee_user           +(gross-fee)
//   platform_revenue     +fee
//
// Note: we use the original pre-settle reservation's payer/payee/gross. The
// fee here is computed from the bps the engineer wants to test against (NOT
// necessarily current bps — the refund approval will use CURRENT bps).
//
// Usage:
//   node tools/qa/inject-call-settlement.mjs <payer_user_id> <payee_user_id> <gross_kobo> <fee_kobo> <call_id>
//
// Stdout: { journal_id, gross_kobo, fee_kobo, payee_credit_kobo }

import crypto from 'node:crypto';
import { pool } from './db.mjs';

const [, , payerUserId, payeeUserId, grossArg, feeArg, callId] = process.argv;
if (!payerUserId || !payeeUserId || !grossArg || !feeArg || !callId) {
  console.error('Usage: node tools/qa/inject-call-settlement.mjs <payer_user_id> <payee_user_id> <gross_kobo> <fee_kobo> <call_id>');
  process.exit(1);
}
const gross = Number(grossArg);
const fee = Number(feeArg);
if (!Number.isInteger(gross) || gross <= 0 || !Number.isInteger(fee) || fee < 0 || fee >= gross) {
  console.error('gross must be positive integer, fee must be non-negative integer < gross');
  process.exit(1);
}
const payeeCredit = gross - fee;

const client = await pool.connect();
try {
  await client.query('BEGIN');

  // Resolve payee account (user wallet). System accounts are pre-known.
  const payeeAcct = await client.query(
    `SELECT id FROM accounts WHERE owner_user_id = $1 AND kind = 'user' AND currency = 'NGN' LIMIT 1`,
    [payeeUserId],
  );
  if (!payeeAcct.rows[0]) {
    throw new Error(`payee user ${payeeUserId} has no wallet account; ask the user to GET /wallet first to materialize one`);
  }
  const payeeAcctId = payeeAcct.rows[0].id;

  const journalId = `je_${crypto.randomBytes(13).toString('hex')}`;
  const idemKey = `settle:${callId}`;

  await client.query(
    `INSERT INTO journal_entries
       (id, kind, idempotency_key, related_user_id, related_call_id, memo)
     VALUES ($1, 'call_settlement', $2, $3, $4, $5)`,
    [journalId, idemKey, payerUserId, callId, `Test call_settlement for ${callId}`],
  );

  const lines = [
    { acct: 'acct_sys_pending_debits_pool', amt: -gross },
    { acct: payeeAcctId, amt: payeeCredit },
    { acct: 'acct_sys_platform_revenue', amt: fee },
  ];
  for (const l of lines) {
    const lineId = `we_${crypto.randomBytes(13).toString('hex')}`;
    await client.query(
      `INSERT INTO wallet_entries (id, journal_id, account_id, signed_amount_kobo, currency)
       VALUES ($1, $2, $3, $4, 'NGN')`,
      [lineId, journalId, l.acct, String(l.amt)],
    );
  }

  await client.query('COMMIT');
  console.log(JSON.stringify({
    journal_id: journalId,
    gross_kobo: gross,
    fee_kobo: fee,
    payee_credit_kobo: payeeCredit,
  }));
} catch (err) {
  await client.query('ROLLBACK').catch(() => {});
  console.error('inject-call-settlement failed:', err.message);
  process.exit(1);
} finally {
  client.release();
  await pool.end();
}
