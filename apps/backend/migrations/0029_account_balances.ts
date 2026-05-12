import type { MigrationBuilder } from 'node-pg-migrate';

// Cached aggregate: one row per account with the running sum of its
// wallet_entries.signed_amount_kobo. Maintained by trigger on wallet_entries
// (next migration). The ledger is the source of truth — this table is just a
// fast-read cache that the reconciliation cron compares against.
//
// Invariant (enforced by reconciliation, not the DB):
//   account_balances.balance_kobo === SUM(wallet_entries.signed_amount_kobo
//                                         WHERE account_id = X)
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TABLE account_balances (
      account_id     TEXT PRIMARY KEY REFERENCES accounts(id),
      balance_kobo   BIGINT NOT NULL DEFAULT 0,
      currency       TEXT NOT NULL DEFAULT 'NGN',
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Pre-populate balance rows for every existing account at zero so the
  // upsert path in the trigger never has to handle a missing row.
  pgm.sql(`
    INSERT INTO account_balances (account_id, balance_kobo, currency)
    SELECT id, 0, currency FROM accounts
    ON CONFLICT (account_id) DO NOTHING
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DROP TABLE IF EXISTS account_balances`);
};
