import type { MigrationBuilder } from 'node-pg-migrate';

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TABLE registration_tokens (
      token_hash     TEXT PRIMARY KEY,
      email          CITEXT NOT NULL,
      phone_number   TEXT NOT NULL,
      channel        TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
      password_hash  TEXT,
      otp_code_id    TEXT REFERENCES otp_codes(id),
      expires_at     TIMESTAMPTZ NOT NULL,
      consumed_at    TIMESTAMPTZ,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql('DROP TABLE IF EXISTS registration_tokens');
};
