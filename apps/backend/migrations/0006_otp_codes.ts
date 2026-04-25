import type { MigrationBuilder } from 'node-pg-migrate';

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TABLE otp_codes (
      id            TEXT PRIMARY KEY,
      purpose       otp_purpose NOT NULL,
      subject_key   TEXT NOT NULL,
      code_hash     TEXT NOT NULL,
      attempts      INT NOT NULL DEFAULT 0,
      max_attempts  INT NOT NULL DEFAULT 5,
      expires_at    TIMESTAMPTZ NOT NULL,
      consumed_at   TIMESTAMPTZ,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  pgm.sql(
    'CREATE INDEX otp_codes_subject_idx ON otp_codes (purpose, subject_key) WHERE consumed_at IS NULL',
  );
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql('DROP TABLE IF EXISTS otp_codes');
};
