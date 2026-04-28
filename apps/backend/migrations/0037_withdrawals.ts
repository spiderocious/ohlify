import type { MigrationBuilder } from 'node-pg-migrate';

// Withdrawals — outbound transfers from user wallet to their saved bank
// account, processed via Paystack Transfer. Lifecycle:
//   pending → processing → completed | failed | reversed
//
// `bank_snapshot` freezes the bank account details at request time so a
// later bank change doesn't retroactively misroute the transfer.
//
// `idempotency_key` is the client-provided Idempotency-Key header (or a
// server-generated one if omitted) — gate against double-submits at the API
// layer. The wallet journal has its OWN idempotency key (wd:<id>:requested)
// keyed off the withdrawal id, so the ledger is safe regardless.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TABLE withdrawals (
      id                       TEXT PRIMARY KEY,
      user_id                  TEXT NOT NULL REFERENCES users(id),
      amount_kobo              BIGINT NOT NULL CHECK (amount_kobo > 0),
      currency                 TEXT NOT NULL DEFAULT 'NGN',
      status                   withdrawal_status NOT NULL DEFAULT 'pending',
      paystack_recipient_code  TEXT,
      paystack_transfer_code   TEXT UNIQUE,
      paystack_transfer_id     TEXT,
      bank_snapshot            JSONB NOT NULL,
      failure_reason           TEXT,
      idempotency_key          TEXT,
      requested_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
      processed_at             TIMESTAMPTZ,
      created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(`CREATE INDEX withdrawals_user_idx ON withdrawals (user_id, requested_at DESC)`);
  pgm.sql(`CREATE INDEX withdrawals_status_idx ON withdrawals (status, requested_at DESC)`);
  // Per-user idempotency on the client-supplied key. Two NULLs are distinct,
  // so omitting the header doesn't cause collisions across distinct requests.
  pgm.sql(
    `CREATE UNIQUE INDEX withdrawals_user_idem_idx
       ON withdrawals (user_id, idempotency_key)
      WHERE idempotency_key IS NOT NULL`,
  );

  // Backfill the FK from wallet_entries → withdrawals (declared in db-schema
  // §3.10 with related_withdrawal_id placeholder; couldn't add the FK at
  // wallet_entries creation time because withdrawals didn't exist yet).
  // Table ships in slice B so we add it here.
  // Note: wallet_entries.related_withdrawal_id is on journal_entries, not
  // wallet_entries, in our schema — adding FK to journal_entries.
  pgm.sql(`
    ALTER TABLE journal_entries
      ADD CONSTRAINT journal_entries_withdrawal_fk
      FOREIGN KEY (related_withdrawal_id) REFERENCES withdrawals(id)
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(
    `ALTER TABLE journal_entries DROP CONSTRAINT IF EXISTS journal_entries_withdrawal_fk`,
  );
  pgm.sql(`DROP TABLE IF EXISTS withdrawals`);
};
