import type { MigrationBuilder } from 'node-pg-migrate';

// Hard exclusion constraint to prevent double-booking the same callee in
// overlapping time windows. The application-level check in
// findOverlappingConfirmedForCallee runs inside the tx with FOR UPDATE for
// a friendly error path, but two concurrent inserts could in principle both
// pass that check before either commits — this DB-level GiST constraint is
// the airtight backstop. The second insert fails with a unique-violation-
// style error (`23P01` exclusion_violation), which the service translates
// to 409 professional_unavailable.
//
// ── Why the wrapper function ────────────────────────────────────────────────
//
// Postgres requires expressions in index/exclusion constraints (and STORED
// generated columns) to be IMMUTABLE. The natural form
//   tstzrange(start_at, start_at + (duration_minutes * INTERVAL '1 minute'))
// is rejected with 42P17 "generation expression is not immutable" because
// `timestamptz + interval` is technically not immutable (DST transitions
// can shift the result for some intervals).
//
// For our use case — adding minutes (no DST risk) — the result IS
// deterministic. We declare a wrapper function `booking_time_range` and
// mark it IMMUTABLE, which lets Postgres accept it as a generated-column
// expression. This is the canonical Postgres pattern for this problem.
//
// Constraint scope: `pending` and `confirmed` bookings only. Once a booking
// is `cancelled_*` or `fulfilled`, its slot is free again.
//
// btree_gist is already enabled in 0001_extensions; no extension setup here.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE OR REPLACE FUNCTION booking_time_range(start_at timestamptz, duration_minutes int)
    RETURNS tstzrange
    LANGUAGE sql
    IMMUTABLE
    PARALLEL SAFE
    AS $$
      SELECT tstzrange(start_at, start_at + (duration_minutes * INTERVAL '1 minute'));
    $$
  `);

  pgm.sql(`
    ALTER TABLE bookings
      ADD COLUMN time_range tstzrange
      GENERATED ALWAYS AS (booking_time_range(start_at, duration_minutes)) STORED
  `);

  pgm.sql(`
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_no_overlap
      EXCLUDE USING gist (
        callee_user_id WITH =,
        time_range WITH &&
      ) WHERE (status IN ('pending', 'confirmed'))
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_no_overlap`);
  pgm.sql(`ALTER TABLE bookings DROP COLUMN IF EXISTS time_range`);
  pgm.sql(`DROP FUNCTION IF EXISTS booking_time_range(timestamptz, int)`);
};
