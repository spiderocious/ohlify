import type { MigrationBuilder } from 'node-pg-migrate';

// Reject illegal payment status transitions at the DB layer (defense in depth
// — TS `payment.transitions.ts` is the primary guard). Allowed:
//
//   pending  → success | failed
//   success  → refunded | partially_refunded
//
// Anything else raises and aborts the tx.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE OR REPLACE FUNCTION payments_assert_transition() RETURNS trigger AS $$
    BEGIN
      IF OLD.status = NEW.status THEN
        RETURN NEW;
      END IF;

      IF OLD.status = 'pending' AND NEW.status IN ('success','failed') THEN
        RETURN NEW;
      END IF;

      IF OLD.status = 'success' AND NEW.status IN ('refunded','partially_refunded') THEN
        RETURN NEW;
      END IF;

      IF OLD.status = 'partially_refunded' AND NEW.status = 'refunded' THEN
        RETURN NEW;
      END IF;

      RAISE EXCEPTION 'illegal payment transition: % -> %', OLD.status, NEW.status;
    END;
    $$ LANGUAGE plpgsql
  `);

  pgm.sql(`
    CREATE TRIGGER payments_status_transition
      BEFORE UPDATE OF status ON payments
      FOR EACH ROW EXECUTE FUNCTION payments_assert_transition()
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DROP TRIGGER IF EXISTS payments_status_transition ON payments`);
  pgm.sql(`DROP FUNCTION IF EXISTS payments_assert_transition()`);
};
