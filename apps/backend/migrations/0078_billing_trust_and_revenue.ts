import type { MigrationBuilder } from 'node-pg-migrate';

// Phase 0 — billing trust + revenue correctness. See docs/revamp-2/prd.md §0.1, §0.4.
//
// 1. `instant_calls` records what the client CLAIMED alongside what we billed,
//    plus which source the billed figure came from. A persistent gap between
//    the two means the call-app event pipeline is broken, and there was
//    previously no way to notice.
//
// 2. `paystack_transfer_fees` — payouts cost us a per-transfer fee that was
//    never journalled anywhere, so `platform_revenue` reported gross margin
//    while reading as profit.
//
// 3. `platform_profit` — one view that nets processor costs out of revenue, so
//    the question "what did we actually make" has a single answer.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    ALTER TABLE instant_calls
      ADD COLUMN client_reported_seconds INT NOT NULL DEFAULT 0
        CHECK (client_reported_seconds >= 0),
      ADD COLUMN duration_source TEXT
        CHECK (duration_source IN ('event_log', 'wall_clock', 'none'))
  `);

  pgm.sql(`
    INSERT INTO accounts (id, kind, owner_user_id, system_code, currency, label, is_active) VALUES
      ('acct_sys_paystack_transfer_fees', 'liability', NULL, 'paystack_transfer_fees',
        'NGN', 'Paystack per-transfer payout fees', TRUE)
    ON CONFLICT DO NOTHING
  `);

  // Revenue and cost both live in wallet_entries; the sign convention makes
  // revenue lines positive on platform_revenue and cost lines positive on the
  // two fee accounts. Netting them needs no CASE — just a signed sum per code.
  pgm.sql(`
    CREATE VIEW platform_profit AS
      SELECT
        date_trunc('day', we.created_at)                        AS day,
        COALESCE(SUM(we.signed_amount_kobo) FILTER (
          WHERE a.system_code = 'platform_revenue'), 0)         AS gross_revenue_kobo,
        COALESCE(SUM(we.signed_amount_kobo) FILTER (
          WHERE a.system_code = 'paystack_fees'), 0)            AS funding_fees_kobo,
        COALESCE(SUM(we.signed_amount_kobo) FILTER (
          WHERE a.system_code = 'paystack_transfer_fees'), 0)   AS transfer_fees_kobo,
        COALESCE(SUM(we.signed_amount_kobo) FILTER (
          WHERE a.system_code = 'platform_revenue'), 0)
          - COALESCE(SUM(we.signed_amount_kobo) FILTER (
            WHERE a.system_code = 'paystack_fees'), 0)
          - COALESCE(SUM(we.signed_amount_kobo) FILTER (
            WHERE a.system_code = 'paystack_transfer_fees'), 0) AS net_profit_kobo
      FROM wallet_entries we
      JOIN accounts a ON a.id = we.account_id
      WHERE a.system_code IN ('platform_revenue', 'paystack_fees', 'paystack_transfer_fees')
      GROUP BY 1
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql('DROP VIEW IF EXISTS platform_profit');
  pgm.sql(`DELETE FROM accounts WHERE system_code = 'paystack_transfer_fees'`);
  pgm.sql(`
    ALTER TABLE instant_calls
      DROP COLUMN IF EXISTS duration_source,
      DROP COLUMN IF EXISTS client_reported_seconds
  `);
};
