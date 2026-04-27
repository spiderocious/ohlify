import type { MigrationBuilder } from 'node-pg-migrate';

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TABLE kyc_submissions (
      id                  TEXT PRIMARY KEY,
      user_id             TEXT NOT NULL REFERENCES users(id),
      identity_type       TEXT NOT NULL CHECK (identity_type IN ('nin','bvn','passport','drivers_license')),
      identity_number     TEXT NOT NULL,
      document_upload_id  TEXT,
      status              kyc_status NOT NULL DEFAULT 'pending_review',
      reviewed_by         TEXT REFERENCES admin_users(id),
      reviewed_at         TIMESTAMPTZ,
      reject_reason_code  TEXT,
      reject_note         TEXT,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(
    `CREATE INDEX kyc_submissions_status_idx ON kyc_submissions (status, created_at) WHERE status = 'pending_review'`,
  );
  pgm.sql(`CREATE INDEX kyc_submissions_user_idx ON kyc_submissions (user_id, created_at DESC)`);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql('DROP TABLE IF EXISTS kyc_submissions');
};
