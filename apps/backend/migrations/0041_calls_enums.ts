import type { MigrationBuilder } from 'node-pg-migrate';

// Enums for the Calls + Bookings + Strikes slice. Created up-front so all
// downstream tables in 0042-0046 can reference them.
//
// ── Collision with migration 0002 ───────────────────────────────────────────
//
// 0002_enums.ts (already applied to every environment) created two enums
// whose names this slice needed:
//
//   - `call_type ('audio', 'video')` — IDENTICAL to what we need.
//     Already used by professional_rates.call_type. We leave it alone here.
//
//   - `call_status (...)` — SPECULATIVE drafting from before the slice
//     spec was finalized. Values were:
//       'pending_payment', 'scheduled', 'active', 'completed',
//       'cancelled', 'missed'
//     None of these match the calls-slice state machine, and verification
//     confirms no column anywhere references this enum and no code
//     references the values:
//       SELECT FROM information_schema.columns WHERE udt_name='call_status'
//         → zero rows
//       grep -rn "pending_payment|'active'.*call_status" apps/backend/src
//         → zero hits
//     So we drop the orphan and recreate with the slice's values. Drop is
//     a near-zero-cost AccessExclusiveLock on the type itself; no tables
//     are touched because nothing depends on the type.
//
// down() restores 0002's call_status shape so this migration is symmetric
// in isolation. call_type is left alone in down() because it predates this
// migration.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TYPE booking_status AS ENUM (
      'pending',
      'confirmed',
      'cancelled_outside_window',
      'cancelled_inside_window',
      'fulfilled'
    )
  `);

  // Orphan from 0002 — see header comment. Drop and recreate.
  pgm.sql(`DROP TYPE IF EXISTS call_status`);
  pgm.sql(`
    CREATE TYPE call_status AS ENUM (
      'scheduled',
      'waiting_for_parties',
      'in_progress',
      'completed',
      'no_show_caller',
      'no_show_callee',
      'no_show_both',
      'disconnected_caller',
      'disconnected_callee'
    )
  `);

  // call_type was created in 0002 with identical values. Reusing it.
  // (No CREATE TYPE call_type here — it already exists from 0002.)

  pgm.sql(`
    CREATE TYPE strike_status AS ENUM ('active', 'disputed', 'upheld', 'voided')
  `);

  pgm.sql(`
    CREATE TYPE strike_reason AS ENUM ('no_show', 'late_cancel', 'mid_call_quit')
  `);

  pgm.sql(`
    CREATE TYPE fee_mode AS ENUM ('deduct_from_payee', 'add_to_payer')
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DROP TYPE IF EXISTS fee_mode`);
  pgm.sql(`DROP TYPE IF EXISTS strike_reason`);
  pgm.sql(`DROP TYPE IF EXISTS strike_status`);
  // Don't drop call_type — it was created by 0002, not this migration.
  // Restore the speculative 0002 call_status shape so down() is symmetric
  // with up() in isolation.
  pgm.sql(`DROP TYPE IF EXISTS call_status`);
  pgm.sql(`
    CREATE TYPE call_status AS ENUM (
      'pending_payment', 'scheduled', 'active', 'completed', 'cancelled', 'missed'
    )
  `);
  pgm.sql(`DROP TYPE IF EXISTS booking_status`);
};
