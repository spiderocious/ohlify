import type { MigrationBuilder } from 'node-pg-migrate';

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TABLE bank_accounts (
      user_id                 TEXT PRIMARY KEY REFERENCES users(id),
      account_number          TEXT NOT NULL,
      bank_code               TEXT NOT NULL REFERENCES banks(code),
      bank_name               TEXT NOT NULL,
      account_name            TEXT NOT NULL,
      paystack_recipient_code TEXT,
      added_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql('DROP TABLE IF EXISTS bank_accounts');
};
