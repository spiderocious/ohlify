import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Lets a second call reach someone who is already on one.
 *
 * Two partial unique indexes enforced "one live call per person" — one on
 * `instant_calls.callee_user_id` (migration 0071), one on
 * `call_participants.user_id` covering anyone in a room (0094). Between them a
 * second call could not even be inserted, so removing the preflight check
 * alone would have turned a clean "they're busy" into a 23505.
 *
 * The product now follows the WhatsApp model: a second call still rings, and
 * the callee chooses to answer-and-end-the-current-one or decline. That
 * decision belongs to the person being called, not to a database constraint.
 *
 * **What these indexes were also doing, and now is not:** the stale-active
 * resolver's comment notes they were what stopped a callee being "pinned and
 * never called again" if a call was never closed. That safety net is gone, so
 * the resolver crons are now the only thing reaping abandoned rows — they run
 * every 60s and still do, but nothing structurally prevents a pile-up of live
 * rows for one user any more.
 *
 * The invite path keeps its own guard (`isUserBusyElsewhere`): being *pulled*
 * into a second room is different from *choosing* to answer a second call.
 */
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`DROP INDEX IF EXISTS instant_calls_one_live_per_callee`);
  pgm.sql(`DROP INDEX IF EXISTS call_participants_one_live_per_user`);

  // Non-unique replacements: the lookups those indexes also served — "is this
  // user in a live call?" — are still made on every preflight and every
  // invite, and losing the index entirely would make them sequential scans.
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS instant_calls_live_per_callee
      ON instant_calls (callee_user_id)
      WHERE status IN ('ringing', 'active')
  `);
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS call_participants_live_per_user
      ON call_participants (user_id)
      WHERE status IN ('pending_approval', 'ringing', 'joined')
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DROP INDEX IF EXISTS instant_calls_live_per_callee`);
  pgm.sql(`DROP INDEX IF EXISTS call_participants_live_per_user`);

  // Restoring uniqueness can fail if concurrent calls exist by then — that is
  // the correct outcome. Silently deleting live calls to satisfy a rollback
  // would destroy billable records.
  pgm.sql(`
    CREATE UNIQUE INDEX instant_calls_one_live_per_callee
      ON instant_calls (callee_user_id)
      WHERE status IN ('ringing', 'active')
  `);
  pgm.sql(`
    CREATE UNIQUE INDEX call_participants_one_live_per_user
      ON call_participants (user_id)
      WHERE status IN ('pending_approval', 'ringing', 'joined')
  `);
};
