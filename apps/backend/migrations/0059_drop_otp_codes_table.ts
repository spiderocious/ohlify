import type { MigrationBuilder } from 'node-pg-migrate';

// OTPs now live exclusively in Redis (TTL-based, single-use, sha256-hashed).
// The otp_codes table and its otp_purpose enum are no longer written or read.
// FK from registration_tokens.otp_code_id was dropped in 0058.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`DROP TABLE IF EXISTS otp_codes`);
  pgm.sql(`DROP TYPE IF EXISTS otp_purpose`);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TYPE otp_purpose AS ENUM (
      'register', 'login', 'forgot_password', 'change_email',
      'change_phone', 'change_password', 'delete_account', 'public_guest'
    )
  `);
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
    `CREATE INDEX otp_codes_subject_idx ON otp_codes (purpose, subject_key) WHERE consumed_at IS NULL`,
  );
};
