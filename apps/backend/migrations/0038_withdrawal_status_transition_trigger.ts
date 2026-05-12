import type { MigrationBuilder } from 'node-pg-migrate';

// Reject illegal withdrawal status transitions at the DB layer (defense in
// depth — TS `withdrawal.transitions.ts` is the primary guard). Allowed:
//
//   pending    → processing | failed
//   processing → completed | failed | reversed
//   failed     → reversed   (admin force-reverse path)
//
// completed and reversed are terminal.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE OR REPLACE FUNCTION withdrawals_assert_transition() RETURNS trigger AS $$
    BEGIN
      IF OLD.status = NEW.status THEN
        RETURN NEW;
      END IF;

      IF OLD.status = 'pending' AND NEW.status IN ('processing','failed') THEN
        RETURN NEW;
      END IF;

      IF OLD.status = 'processing' AND NEW.status IN ('completed','failed','reversed') THEN
        RETURN NEW;
      END IF;

      IF OLD.status = 'failed' AND NEW.status = 'reversed' THEN
        RETURN NEW;
      END IF;

      RAISE EXCEPTION 'illegal withdrawal transition: % -> %', OLD.status, NEW.status;
    END;
    $$ LANGUAGE plpgsql
  `);

  pgm.sql(`
    CREATE TRIGGER withdrawals_status_transition
      BEFORE UPDATE OF status ON withdrawals
      FOR EACH ROW EXECUTE FUNCTION withdrawals_assert_transition()
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DROP TRIGGER IF EXISTS withdrawals_status_transition ON withdrawals`);
  pgm.sql(`DROP FUNCTION IF EXISTS withdrawals_assert_transition()`);
};
