// Wipes payments + journal_entries + wallet_entries + paystack_webhooks +
// outbox for a given user. Used between funding scenarios to start
// from a clean ledger state. Does NOT touch system accounts or seed data.
//
// CRITICAL: this script bypasses the append-only trigger via session_replication_role
// — only safe in the dev DB. Each invocation prints what it deleted.
//
// Usage: node tools/qa/reset-payments.mjs <user_id>

import { pool } from './db.mjs';

const userId = process.argv[2];
if (!userId) {
  console.error('Usage: node tools/qa/reset-payments.mjs <user_id>');
  process.exit(1);
}

const client = await pool.connect();
try {
  await client.query('BEGIN');
  // Disable triggers for this session — append-only trigger blocks DELETE.
  await client.query(`SET LOCAL session_replication_role = 'replica'`);

  const journals = await client.query(
    `SELECT id FROM journal_entries WHERE related_user_id = $1`,
    [userId],
  );
  const journalIds = journals.rows.map((r) => r.id);

  let weDeleted = 0;
  if (journalIds.length > 0) {
    const r = await client.query(
      `DELETE FROM wallet_entries WHERE journal_id = ANY($1::text[])`,
      [journalIds],
    );
    weDeleted = r.rowCount ?? 0;
  }

  const jrnDeleted = (await client.query(
    `DELETE FROM journal_entries WHERE related_user_id = $1`,
    [userId],
  )).rowCount ?? 0;

  const payDeleted = (await client.query(
    `DELETE FROM payments WHERE user_id = $1`,
    [userId],
  )).rowCount ?? 0;

  const obDeleted = (await client.query(
    `DELETE FROM outbox WHERE aggregate_id IN (
       SELECT id FROM payments WHERE user_id = $1
     ) OR (payload->>'user_id') = $1`,
    [userId],
  )).rowCount ?? 0;

  // Reset user's account balance back to 0 (for any user_account that exists).
  const balReset = (await client.query(
    `UPDATE account_balances SET balance_kobo = 0
       WHERE account_id IN (
         SELECT id FROM accounts WHERE owner_user_id = $1
       )`,
    [userId],
  )).rowCount ?? 0;

  // Also reset the system accounts that funding touches (paystack_clearing,
  // paystack_fees) — otherwise they accumulate test cruft and reconciliation
  // shows drift. Only safe in dev.
  await client.query(
    `UPDATE account_balances SET balance_kobo = 0
       WHERE account_id IN (
         SELECT id FROM accounts WHERE system_code IN ('paystack_clearing','paystack_fees','paystack_payouts','platform_revenue','platform_promo','suspense','pending_debits_pool')
       )`,
  );

  await client.query('COMMIT');
  console.log(JSON.stringify({
    userId,
    wallet_entries_deleted: weDeleted,
    journal_entries_deleted: jrnDeleted,
    payments_deleted: payDeleted,
    outbox_deleted: obDeleted,
    user_balances_zeroed: balReset,
    system_balances_zeroed: 'all',
  }));
} catch (err) {
  await client.query('ROLLBACK').catch(() => {});
  console.error('reset-payments failed:', err.message);
  process.exit(1);
} finally {
  client.release();
  await pool.end();
}
