import type { MigrationBuilder } from 'node-pg-migrate';

// Reject illegal refund_request transitions at the DB layer. Allowed:
//
//   pending → approved | auto_approved | rejected
//
// approved / auto_approved / rejected are terminal.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE OR REPLACE FUNCTION refund_requests_assert_transition() RETURNS trigger AS $$
    BEGIN
      IF OLD.status = NEW.status THEN
        RETURN NEW;
      END IF;

      IF OLD.status = 'pending' AND NEW.status IN ('approved','auto_approved','rejected') THEN
        RETURN NEW;
      END IF;

      RAISE EXCEPTION 'illegal refund_request transition: % -> %', OLD.status, NEW.status;
    END;
    $$ LANGUAGE plpgsql
  `);

  pgm.sql(`
    CREATE TRIGGER refund_requests_status_transition
      BEFORE UPDATE OF status ON refund_requests
      FOR EACH ROW EXECUTE FUNCTION refund_requests_assert_transition()
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DROP TRIGGER IF EXISTS refund_requests_status_transition ON refund_requests`);
  pgm.sql(`DROP FUNCTION IF EXISTS refund_requests_assert_transition()`);
};
