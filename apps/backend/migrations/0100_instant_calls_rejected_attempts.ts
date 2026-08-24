import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Records call attempts that never rang.
 *
 * A call rejected at preflight — the professional is offline, not accepting,
 * or inside a DnD block — used to return an error with no trace: no row, so
 * nothing in either party's call history and nothing to notify the
 * professional about. From the professional's side, someone trying to reach
 * them was simply invisible.
 *
 * `rejected` is terminal on arrival: it never rings, never connects, is never
 * billed, and settles nothing. `rejection_reason` stores the
 * `ReachabilityDetail` value that produced it, so the reason survives for
 * support and for the "you missed an attempt" copy.
 *
 * The status is deliberately NOT `missed`: `missed` means the phone rang and
 * nobody picked up, which carries a strike in the no-show rules. An attempt
 * that never reached the device must not be counted against anyone.
 */
export const up = (pgm: MigrationBuilder): void => {
  // ADD VALUE cannot run inside a transaction block in older PGs; IF NOT
  // EXISTS makes the statement safe to re-run either way.
  pgm.sql(`ALTER TYPE instant_call_status ADD VALUE IF NOT EXISTS 'rejected'`);
  pgm.sql(`ALTER TABLE instant_calls ADD COLUMN IF NOT EXISTS rejection_reason TEXT`);
  // History reads filter by callee and order by recency; attempts are part of
  // that list, so they ride the existing instant_calls_callee_idx.
};

export const down = (pgm: MigrationBuilder): void => {
  // Postgres cannot drop a single enum value. Rows using it are removed so the
  // column is safe to read, and the value is left in place — harmless once no
  // code emits it.
  pgm.sql(`DELETE FROM instant_calls WHERE status = 'rejected'`);
  pgm.sql(`ALTER TABLE instant_calls DROP COLUMN IF EXISTS rejection_reason`);
};
