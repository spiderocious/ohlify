import type { MigrationBuilder } from 'node-pg-migrate';

// Append-only ledger lines. Each line credits or debits exactly one account.
// The set of lines for a given journal_id MUST sum to zero (enforced by
// trigger in the next migration).
//
// Money safety:
//   * BIGINT for signed_amount_kobo — never NUMERIC, never DOUBLE.
//   * CHECK signed_amount_kobo <> 0 — zero-amount lines are bookkeeping noise.
//   * UNIQUE (journal_id, account_id) — an account appears at most once per
//     journal. Forces multi-step flows to use multiple journals rather than
//     stacking entries on the same account in one journal (cleaner audit).
//   * UPDATE / DELETE rejected by trigger (in 0030) — true append-only.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TABLE wallet_entries (
      id                  TEXT PRIMARY KEY,
      journal_id          TEXT NOT NULL REFERENCES journal_entries(id),
      account_id          TEXT NOT NULL REFERENCES accounts(id),
      signed_amount_kobo  BIGINT NOT NULL CHECK (signed_amount_kobo <> 0),
      currency            TEXT NOT NULL DEFAULT 'NGN',
      created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(`CREATE UNIQUE INDEX wallet_entries_journal_account_idx ON wallet_entries (journal_id, account_id)`);
  pgm.sql(`CREATE INDEX wallet_entries_account_created_idx ON wallet_entries (account_id, created_at DESC)`);
  pgm.sql(`CREATE INDEX wallet_entries_journal_idx ON wallet_entries (journal_id)`);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DROP TABLE IF EXISTS wallet_entries`);
};
