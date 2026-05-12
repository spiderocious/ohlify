import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Tracks which keys in `reject_item_keys` the user has actually
 * patched since the rejection landed. The complete endpoint requires
 * every flagged key to be acknowledged before letting the user
 * resubmit — it stops the "click Proceed without changing anything"
 * loophole that came up in QA.
 *
 * Stored on the same `kyc_submissions` row that carries the rejection
 * (i.e. the one whose `status = 'rejected'`). Acknowledgement is
 * append-only during a resubmit cycle and gets cleared when the admin
 * either approves or rejects again.
 *
 * NULL or empty = nothing acknowledged yet (or no rejection in flight).
 *
 * DOWN: drops the column. Existing rejected rows lose their progress
 * tracking; the next PATCH would re-acknowledge from scratch.
 */
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    ALTER TABLE kyc_submissions
      ADD COLUMN reject_acknowledged_keys TEXT[]
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    ALTER TABLE kyc_submissions
      DROP COLUMN IF EXISTS reject_acknowledged_keys
  `);
};
