// Posts a balanced multi-line journal directly via raw SQL inside one tx.
// Bypasses any service-level guard but relies on the DB sum-to-zero trigger
// at COMMIT to catch mistakes.
//
// Usage:
//   node tools/qa/inject-balanced-journal.mjs '<json>'
//
// JSON shape:
//   {
//     "kind": "admin_manual",
//     "idempotency_key": "manual-test-1",
//     "lines": [
//       { "account_id": "acct_xxx", "signed_amount_kobo": 100 },
//       { "account_id": "acct_yyy", "signed_amount_kobo": -100 }
//     ],
//     "related_user_id": "u_xxx",            // optional
//     "related_call_id": "c_xxx",            // optional
//     "memo": "..."                           // optional
//   }
//
// Stdout: { journal_id }

import crypto from 'node:crypto';
import { pool } from './db.mjs';

const arg = process.argv[2];
if (!arg) {
  console.error('Usage: node tools/qa/inject-balanced-journal.mjs \'<json>\'');
  process.exit(1);
}
const input = JSON.parse(arg);
const { kind, idempotency_key, lines, related_user_id, related_call_id, memo } = input;
if (!kind || !idempotency_key || !Array.isArray(lines) || lines.length < 2) {
  console.error('Required: kind, idempotency_key, lines[]');
  process.exit(1);
}

const sum = lines.reduce((a, l) => a + Number(l.signed_amount_kobo), 0);
if (sum !== 0) {
  console.error(`Lines do not sum to zero: ${sum}`);
  process.exit(1);
}

const journalId = `je_${crypto.randomBytes(13).toString('hex')}`;

const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query(
    `INSERT INTO journal_entries
       (id, kind, idempotency_key, related_user_id, related_call_id, memo)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      journalId,
      kind,
      idempotency_key,
      related_user_id ?? null,
      related_call_id ?? null,
      memo ?? null,
    ],
  );

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineId = `we_${crypto.randomBytes(13).toString('hex')}`;
    await client.query(
      `INSERT INTO wallet_entries (id, journal_id, account_id, signed_amount_kobo, currency)
       VALUES ($1, $2, $3, $4, 'NGN')`,
      [lineId, journalId, line.account_id, String(line.signed_amount_kobo)],
    );
  }

  await client.query('COMMIT');
  console.log(JSON.stringify({ journal_id: journalId }));
} catch (err) {
  await client.query('ROLLBACK').catch(() => {});
  console.error('inject failed:', err.message);
  process.exit(1);
} finally {
  client.release();
  await pool.end();
}
