import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Backfill consistency between `users.kyc_status` and the latest
 * `kyc_submissions` row, and clean up stale `users.kyc_reject_reason`
 * left over from prior rejections that were later auto-approved.
 *
 * Why: pre-this-migration, `POST /onboarding/kyc/complete` set
 * `users.kyc_status` directly without touching the submission row. With
 * `kyc.auto_approve = true` (current default), every completion left an
 * "approved" user with a `pending_review` submission row indefinitely.
 * If the user had previously been rejected, `users.kyc_reject_reason`
 * also stayed populated.
 *
 * Symptoms this fixed for ops:
 *   - Admin KYC queue showed `pending_review` rows for users who were
 *     actually approved and live in discovery — wasting reviewer time.
 *   - The customer rejection screen reads `latest_submission_status`
 *     to switch between rejection and awaiting-review variants. With
 *     stale rows, it could land on the wrong variant or short-circuit
 *     the rejection flow entirely.
 *   - Admin user-detail showed a `kyc_reject_reason` badge on
 *     approved users, looking like the user is still in trouble.
 *
 * This migration is idempotent and never downgrades a real status.
 *
 * DOWN: no-op. We can't tell which rows were stamped by this backfill
 * vs. which arrived in this state from the new write path, and reverting
 * either would lose state.
 */
export const up = (pgm: MigrationBuilder): void => {
  // 1. Sync the latest non-approved submission row to 'approved' for any
  //    user whose users.kyc_status='approved'. Only the LATEST row per
  //    user is touched — older history is preserved.
  pgm.sql(`
    WITH latest_per_user AS (
      SELECT DISTINCT ON (user_id) id, user_id, status
        FROM kyc_submissions
       ORDER BY user_id, created_at DESC
    )
    UPDATE kyc_submissions ks
       SET status = 'approved'::kyc_status,
           reviewed_at = COALESCE(u.kyc_reviewed_at, now()),
           reject_reason_code = NULL,
           reject_note = NULL
      FROM latest_per_user lpu
      JOIN users u ON u.id = lpu.user_id
     WHERE ks.id = lpu.id
       AND u.kyc_status = 'approved'
       AND lpu.status <> 'approved'
       AND u.deleted_at IS NULL
  `);

  // 2. Null out leftover kyc_reject_reason on users who are now approved.
  pgm.sql(`
    UPDATE users
       SET kyc_reject_reason = NULL,
           updated_at = now()
     WHERE kyc_status = 'approved'
       AND kyc_reject_reason IS NOT NULL
       AND deleted_at IS NULL
  `);
};

export const down = (_pgm: MigrationBuilder): void => {
  // No-op. See header comment.
};
