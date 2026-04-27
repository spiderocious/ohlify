import type { MigrationBuilder } from 'node-pg-migrate';

// Wallet accounts table — the spine of the double-entry ledger.
//
// Three flavors:
//   user       — one per user, owner_user_id set, system_code NULL
//   system     — singleton platform accounts identified by system_code
//                (e.g. paystack_clearing, platform_revenue)
//   liability  — money we owe outside parties (e.g. paystack_payouts liability
//                until Paystack confirms transfer success)
//
// Sign convention (per Q2: banker-style):
//   wallet_entries.signed_amount_kobo is positive when the account's balance
//   should INCREASE, negative when it should DECREASE. Every journal sums to
//   zero across its lines.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TYPE account_kind AS ENUM ('user','system','liability')
  `);

  pgm.sql(`
    CREATE TABLE accounts (
      id              TEXT PRIMARY KEY,
      kind            account_kind NOT NULL,
      owner_user_id   TEXT REFERENCES users(id),
      system_code     TEXT,
      currency        TEXT NOT NULL DEFAULT 'NGN',
      label           TEXT NOT NULL,
      is_active       BOOLEAN NOT NULL DEFAULT TRUE,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      CHECK (
        (kind = 'user' AND owner_user_id IS NOT NULL AND system_code IS NULL)
        OR (kind IN ('system','liability') AND owner_user_id IS NULL AND system_code IS NOT NULL)
      )
    )
  `);

  // One user wallet per user per currency.
  pgm.sql(`
    CREATE UNIQUE INDEX accounts_user_unique_idx
      ON accounts (owner_user_id, currency)
      WHERE kind = 'user'
  `);

  // One system/liability account per code per currency.
  pgm.sql(`
    CREATE UNIQUE INDEX accounts_system_unique_idx
      ON accounts (system_code, currency)
      WHERE kind IN ('system','liability')
  `);

  pgm.sql(`CREATE INDEX accounts_owner_idx ON accounts (owner_user_id) WHERE kind = 'user'`);
  pgm.sql(`CREATE INDEX accounts_kind_idx ON accounts (kind, is_active)`);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DROP TABLE IF EXISTS accounts`);
  pgm.sql(`DROP TYPE IF EXISTS account_kind`);
};
