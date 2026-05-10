import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Backfill `users.avatar_url` from each user's most recent KYC submission's
 * `selfie_upload_key`. Only fills in users whose avatar is currently NULL —
 * never clobbers an admin- or user-chosen avatar.
 *
 * Going forward, `onboarding.service.ts` writes the selfie key to
 * `users.avatar_url` (when null) at submission time so this backfill only
 * matters once. The DOWN migration is a no-op on purpose: we don't know
 * which avatars were set by this migration vs. the new submission flow,
 * and reverting either would lose user-set avatars.
 */
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    WITH latest_selfies AS (
      SELECT DISTINCT ON (user_id)
             user_id,
             selfie_upload_key
        FROM kyc_submissions
       WHERE selfie_upload_key IS NOT NULL
       ORDER BY user_id, created_at DESC
    )
    UPDATE users u
       SET avatar_url = ls.selfie_upload_key,
           updated_at = now()
      FROM latest_selfies ls
     WHERE u.id = ls.user_id
       AND u.avatar_url IS NULL
       AND u.deleted_at IS NULL
  `);
};

export const down = (_pgm: MigrationBuilder): void => {
  // No-op. See header comment.
};
