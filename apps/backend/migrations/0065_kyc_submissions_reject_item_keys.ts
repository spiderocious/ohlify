import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Per-item KYC rejection support.
 *
 * Today admins can only reject a whole submission with a single
 * `reject_reason_code` + `reject_note`. This forces users to re-touch every
 * item they already filled in, even when only one (e.g. selfie) is the
 * problem.
 *
 * `reject_item_keys` carries the optional set of KYC item keys the admin
 * wants the user to resubmit:
 *
 *   - NULL or empty array → reject-all (current behavior, preserved)
 *   - non-empty array     → partial rejection; the user UI shows + allows
 *                           edits for ONLY those keys, others are locked
 *
 * Item keys are the same `KycItemKey` union enforced in code — no DB-level
 * CHECK because the set is admin-toggleable via platform_config.kyc.* and
 * we don't want a migration to gate that.
 *
 * DOWN: drops the column. Existing rows lose their per-item set; the
 * rejection itself remains valid (reason + note still in place).
 */
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    ALTER TABLE kyc_submissions
      ADD COLUMN reject_item_keys TEXT[]
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    ALTER TABLE kyc_submissions
      DROP COLUMN IF EXISTS reject_item_keys
  `);
};
