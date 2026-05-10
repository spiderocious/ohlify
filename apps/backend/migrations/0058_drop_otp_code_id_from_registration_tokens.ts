import type { MigrationBuilder } from 'node-pg-migrate';

// otp_codes table is being retired — OTPs now live exclusively in Redis.
// Step 1: drop the FK column on registration_tokens that referenced it.
// Column was nullable and never read by the app (only written as a side-effect
// of createOtpCode which is also being removed). Safe single-PR DROP because
// the column is nullable and nothing SELECTs it.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(
    `ALTER TABLE registration_tokens DROP COLUMN IF EXISTS otp_code_id`,
  );
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(
    `ALTER TABLE registration_tokens ADD COLUMN IF NOT EXISTS otp_code_id TEXT REFERENCES otp_codes(id)`,
  );
};
