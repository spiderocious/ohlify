import type { MigrationBuilder } from 'node-pg-migrate';

// Adds selfie support to the KYC submissions table. The doc photo column
// (document_upload_id) already exists from 0014 — we keep its name for
// historical continuity but its semantics change: it now stores the FILE
// SERVICE KEY (a UUID + extension) rather than an internal upload row id.
//
// Why no enum change: 0014 only added free-text columns; there is no
// upload_category enum constraining them. Keys are validated by zod at
// the application layer (regex check on save).
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    ALTER TABLE kyc_submissions
      ADD COLUMN IF NOT EXISTS selfie_upload_key TEXT
  `);

  // Backfill rename intent: document_upload_id is now logically a file-service
  // key. We don't rename the column to avoid breaking existing reads in slice
  // code that hasn't migrated yet — application code treats both old (internal
  // upload-row IDs) and new (file-service keys) values uniformly through the
  // same getter.
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`ALTER TABLE kyc_submissions DROP COLUMN IF EXISTS selfie_upload_key`);
};
