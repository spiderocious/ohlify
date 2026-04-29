import type { MigrationBuilder } from 'node-pg-migrate';

// Unify strikes — pro and caller share one table.
//
// Why: caller strikes need the same lifecycle (active → disputed → upheld /
// voided), same auto-ban threshold (config-tuned, separate from pro), same
// dispute window. One table with `subject_role` is cleaner than mirror tables
// — auto-ban counting is one query per role, admin "list all strikes" is one
// query for both.
//
// What changes:
//   - `professional_strikes` → `strikes`
//   - `professional_user_id` → `subject_user_id`
//   - new `subject_role` column ('professional' | 'caller')
//   - existing rows backfilled to `subject_role = 'professional'` via DEFAULT
//   - DEFAULT dropped after backfill so new inserts must specify
//   - `strike_reason` enum gets `caller_no_show` + `caller_disconnect`
//   - the partial unique index on (related_call_id, reason_code) becomes
//     (related_call_id, reason_code, subject_role) so caller + pro can each
//     have a strike on the same call+reason without colliding
//   - status-transition trigger function renamed
//   - new platform_config keys for caller-side config
export const up = (pgm: MigrationBuilder): void => {
  // Drop the old trigger before renaming the table (the trigger references
  // the old function name; the function references the table).
  pgm.sql(`DROP TRIGGER IF EXISTS professional_strikes_status_transition ON professional_strikes`);
  pgm.sql(`DROP FUNCTION IF EXISTS professional_strikes_assert_transition()`);

  // Drop the partial unique index — its name embeds the old table name.
  pgm.sql(`DROP INDEX IF EXISTS professional_strikes_one_per_call_reason_idx`);

  // Rename the table + column.
  pgm.sql(`ALTER TABLE professional_strikes RENAME TO strikes`);
  pgm.sql(`ALTER TABLE strikes RENAME COLUMN professional_user_id TO subject_user_id`);

  // Add subject_role with DEFAULT, backfill, then drop the DEFAULT.
  pgm.sql(`
    ALTER TABLE strikes
      ADD COLUMN subject_role TEXT NOT NULL DEFAULT 'professional'
      CHECK (subject_role IN ('professional', 'caller'))
  `);
  pgm.sql(`ALTER TABLE strikes ALTER COLUMN subject_role DROP DEFAULT`);

  // Rename the by-pro index too — `professional_strikes_pro_idx` would now
  // mislead. Drop + recreate with the new name.
  pgm.sql(`DROP INDEX IF EXISTS professional_strikes_pro_idx`);
  pgm.sql(`DROP INDEX IF EXISTS professional_strikes_status_idx`);
  pgm.sql(
    `CREATE INDEX strikes_subject_idx ON strikes (subject_user_id, subject_role, created_at DESC)`,
  );
  pgm.sql(`CREATE INDEX strikes_status_idx ON strikes (status, created_at DESC)`);

  // Recreate the partial unique with subject_role included.
  pgm.sql(
    `CREATE UNIQUE INDEX strikes_one_per_call_reason_role_idx
       ON strikes (related_call_id, reason_code, subject_role)
      WHERE related_call_id IS NOT NULL`,
  );

  // Extend the strike_reason enum.
  pgm.sql(`ALTER TYPE strike_reason ADD VALUE IF NOT EXISTS 'caller_no_show'`);
  pgm.sql(`ALTER TYPE strike_reason ADD VALUE IF NOT EXISTS 'caller_disconnect'`);

  // Recreate the status-transition trigger under the new function name.
  pgm.sql(`
    CREATE OR REPLACE FUNCTION strikes_assert_transition() RETURNS trigger AS $$
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
    CREATE TRIGGER strikes_status_transition
      BEFORE UPDATE OF status ON strikes
      FOR EACH ROW EXECUTE FUNCTION strikes_assert_transition()
  `);

  // Seed caller-side platform_config keys. Threshold is higher than pro's
  // (3) because callers are higher volume and a single bad day shouldn't
  // ban them. Tunable.
  pgm.sql(`
    INSERT INTO platform_config (key, value, is_public) VALUES
      ('caller.strike_on_no_show',           'true',  FALSE),
      ('caller.strike_on_disconnect',        'true',  FALSE),
      ('caller.strikes_before_ban',          '5',     TRUE),
      ('caller.strike_dispute_window_days',  '14',    TRUE)
    ON CONFLICT (key) DO NOTHING
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  // Reverse: drop new indexes, drop trigger + function, rename column +
  // table back, restore the original trigger + function + indexes.
  // Note: we don't drop the new strike_reason enum values — Postgres can't
  // remove enum values without a full type recreate.
  pgm.sql(`
    DELETE FROM platform_config WHERE key IN (
      'caller.strike_on_no_show',
      'caller.strike_on_disconnect',
      'caller.strikes_before_ban',
      'caller.strike_dispute_window_days'
    )
  `);

  pgm.sql(`DROP TRIGGER IF EXISTS strikes_status_transition ON strikes`);
  pgm.sql(`DROP FUNCTION IF EXISTS strikes_assert_transition()`);

  pgm.sql(`DROP INDEX IF EXISTS strikes_one_per_call_reason_role_idx`);
  pgm.sql(`DROP INDEX IF EXISTS strikes_subject_idx`);
  pgm.sql(`DROP INDEX IF EXISTS strikes_status_idx`);

  pgm.sql(`ALTER TABLE strikes DROP COLUMN IF EXISTS subject_role`);
  pgm.sql(`ALTER TABLE strikes RENAME COLUMN subject_user_id TO professional_user_id`);
  pgm.sql(`ALTER TABLE strikes RENAME TO professional_strikes`);

  pgm.sql(
    `CREATE INDEX professional_strikes_pro_idx
       ON professional_strikes (professional_user_id, created_at DESC)`,
  );
  pgm.sql(
    `CREATE INDEX professional_strikes_status_idx
       ON professional_strikes (status, created_at DESC)`,
  );
  pgm.sql(
    `CREATE UNIQUE INDEX professional_strikes_one_per_call_reason_idx
       ON professional_strikes (related_call_id, reason_code)
      WHERE related_call_id IS NOT NULL`,
  );

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
