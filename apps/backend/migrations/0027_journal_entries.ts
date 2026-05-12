import type { MigrationBuilder } from 'node-pg-migrate';

// Journal headers — one row per atomic money movement. Lines live in
// `wallet_entries`. Idempotency is enforced at this level (not per-line) so
// retries of an entire journal are cleanly no-op.
//
// `kind` is enum'd to keep the lint-clean set of operations explicit. Adding
// a new flow = adding a value here + one in the lib/wallet/accounting builder.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TYPE journal_kind AS ENUM (
      'wallet_funding',
      'wallet_funding_reversed',
      'call_payment_reserve',
      'call_settlement',
      'call_refund',
      'call_refund_post_settle',
      'withdrawal_requested',
      'withdrawal_completed',
      'withdrawal_reversed',
      'admin_credit',
      'admin_debit',
      'admin_manual',
      'platform_promo_grant'
    )
  `);

  pgm.sql(`
    CREATE TABLE journal_entries (
      id                    TEXT PRIMARY KEY,
      kind                  journal_kind NOT NULL,
      idempotency_key       TEXT NOT NULL UNIQUE,
      related_call_id       TEXT,
      related_payment_id    TEXT,
      related_withdrawal_id TEXT,
      related_user_id       TEXT REFERENCES users(id),
      memo                  TEXT,
      created_by_admin_id   TEXT,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(`CREATE INDEX journal_entries_kind_idx ON journal_entries (kind, created_at DESC)`);
  pgm.sql(
    `CREATE INDEX journal_entries_related_user_idx ON journal_entries (related_user_id, created_at DESC) WHERE related_user_id IS NOT NULL`,
  );
  pgm.sql(
    `CREATE INDEX journal_entries_related_call_idx ON journal_entries (related_call_id) WHERE related_call_id IS NOT NULL`,
  );
  pgm.sql(
    `CREATE INDEX journal_entries_related_payment_idx ON journal_entries (related_payment_id) WHERE related_payment_id IS NOT NULL`,
  );
  pgm.sql(
    `CREATE INDEX journal_entries_related_withdrawal_idx ON journal_entries (related_withdrawal_id) WHERE related_withdrawal_id IS NOT NULL`,
  );
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DROP TABLE IF EXISTS journal_entries`);
  pgm.sql(`DROP TYPE IF EXISTS journal_kind`);
};
