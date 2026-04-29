import type { MigrationBuilder } from 'node-pg-migrate';

// Status-transition triggers for booking, call, and strike. Reject illegal
// transitions at the DB layer — application code can be wrong; the trigger
// is the last line of defence.
//
// Allowed transitions:
//
// booking_status:
//   pending → confirmed
//   confirmed → cancelled_outside_window | cancelled_inside_window | fulfilled
//   (terminals: cancelled_*, fulfilled)
//
// call_status:
//   scheduled → waiting_for_parties
//   scheduled → no_show_caller | no_show_callee | no_show_both
//                   (booking cancellation can short-circuit before start)
//   waiting_for_parties → in_progress
//   waiting_for_parties → no_show_caller | no_show_callee | no_show_both
//   in_progress → completed | disconnected_caller | disconnected_callee
//   (terminals: completed, no_show_*, disconnected_*)
//
// strike_status:
//   active → disputed | voided
//   disputed → upheld | voided
//   (terminals: upheld, voided)
export const up = (pgm: MigrationBuilder): void => {
  // ── booking ────────────────────────────────────────────────────────────────
  pgm.sql(`
    CREATE OR REPLACE FUNCTION bookings_assert_transition() RETURNS trigger AS $$
    BEGIN
      IF OLD.status = NEW.status THEN
        RETURN NEW;
      END IF;
      IF OLD.status = 'pending' AND NEW.status = 'confirmed' THEN
        RETURN NEW;
      END IF;
      IF OLD.status = 'confirmed' AND NEW.status IN (
        'cancelled_outside_window', 'cancelled_inside_window', 'fulfilled'
      ) THEN
        RETURN NEW;
      END IF;
      RAISE EXCEPTION 'illegal booking transition: % -> %', OLD.status, NEW.status;
    END;
    $$ LANGUAGE plpgsql
  `);
  pgm.sql(`
    CREATE TRIGGER bookings_status_transition
      BEFORE UPDATE OF status ON bookings
      FOR EACH ROW EXECUTE FUNCTION bookings_assert_transition()
  `);

  // ── call ───────────────────────────────────────────────────────────────────
  pgm.sql(`
    CREATE OR REPLACE FUNCTION calls_assert_transition() RETURNS trigger AS $$
    BEGIN
      IF OLD.status = NEW.status THEN
        RETURN NEW;
      END IF;
      IF OLD.status = 'scheduled' AND NEW.status IN (
        'waiting_for_parties', 'no_show_caller', 'no_show_callee', 'no_show_both'
      ) THEN
        RETURN NEW;
      END IF;
      IF OLD.status = 'waiting_for_parties' AND NEW.status IN (
        'in_progress', 'no_show_caller', 'no_show_callee', 'no_show_both'
      ) THEN
        RETURN NEW;
      END IF;
      IF OLD.status = 'in_progress' AND NEW.status IN (
        'completed', 'disconnected_caller', 'disconnected_callee'
      ) THEN
        RETURN NEW;
      END IF;
      RAISE EXCEPTION 'illegal call transition: % -> %', OLD.status, NEW.status;
    END;
    $$ LANGUAGE plpgsql
  `);
  pgm.sql(`
    CREATE TRIGGER calls_status_transition
      BEFORE UPDATE OF status ON calls
      FOR EACH ROW EXECUTE FUNCTION calls_assert_transition()
  `);

  // ── strike ─────────────────────────────────────────────────────────────────
  pgm.sql(`
    CREATE OR REPLACE FUNCTION professional_strikes_assert_transition() RETURNS trigger AS $$
    BEGIN
      IF OLD.status = NEW.status THEN
        RETURN NEW;
      END IF;
      IF OLD.status = 'active' AND NEW.status IN ('disputed', 'voided') THEN
        RETURN NEW;
      END IF;
      IF OLD.status = 'disputed' AND NEW.status IN ('upheld', 'voided') THEN
        RETURN NEW;
      END IF;
      RAISE EXCEPTION 'illegal strike transition: % -> %', OLD.status, NEW.status;
    END;
    $$ LANGUAGE plpgsql
  `);
  pgm.sql(`
    CREATE TRIGGER professional_strikes_status_transition
      BEFORE UPDATE OF status ON professional_strikes
      FOR EACH ROW EXECUTE FUNCTION professional_strikes_assert_transition()
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DROP TRIGGER IF EXISTS professional_strikes_status_transition ON professional_strikes`);
  pgm.sql(`DROP FUNCTION IF EXISTS professional_strikes_assert_transition()`);
  pgm.sql(`DROP TRIGGER IF EXISTS calls_status_transition ON calls`);
  pgm.sql(`DROP FUNCTION IF EXISTS calls_assert_transition()`);
  pgm.sql(`DROP TRIGGER IF EXISTS bookings_status_transition ON bookings`);
  pgm.sql(`DROP FUNCTION IF EXISTS bookings_assert_transition()`);
};
