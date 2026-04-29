import type { MigrationBuilder } from 'node-pg-migrate';

// Reshape admin_audit_log from the slice-9 placeholder into the production
// schema:
//   - actor_id  → admin_user_id, drop NOT NULL (stub-token writes have no
//                 admin_users row; we record admin_user_id NULL and stash
//                 'adm_stub' in metadata).
//   - args      → metadata
//   - ip (INET) → ip_address (TEXT). INET is fine but TEXT matches the
//                 user_agent style and avoids client-side coercion.
//   - + user_agent column.
//   - + append-only triggers (no UPDATE, no DELETE).
//
// We rebuild indexes with the new column names. `note` is kept as-is (free-
// text annotation surface), even though the middleware uses `metadata`
// for everything; legacy 0009 rows that wrote into `note` survive untouched.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`ALTER TABLE admin_audit_log ALTER COLUMN actor_id DROP NOT NULL`);
  pgm.sql(`ALTER TABLE admin_audit_log RENAME COLUMN actor_id TO admin_user_id`);
  pgm.sql(`ALTER TABLE admin_audit_log RENAME COLUMN args TO metadata`);
  pgm.sql(
    `ALTER TABLE admin_audit_log ALTER COLUMN metadata SET DEFAULT '{}'::jsonb`,
  );
  pgm.sql(`UPDATE admin_audit_log SET metadata = '{}'::jsonb WHERE metadata IS NULL`);
  pgm.sql(`ALTER TABLE admin_audit_log ALTER COLUMN metadata SET NOT NULL`);
  pgm.sql(`ALTER TABLE admin_audit_log ALTER COLUMN ip TYPE TEXT USING ip::text`);
  pgm.sql(`ALTER TABLE admin_audit_log RENAME COLUMN ip TO ip_address`);
  pgm.sql(`ALTER TABLE admin_audit_log ADD COLUMN IF NOT EXISTS user_agent TEXT`);

  pgm.sql(`DROP INDEX IF EXISTS admin_audit_log_created_idx`);
  pgm.sql(`DROP INDEX IF EXISTS admin_audit_log_actor_idx`);
  pgm.sql(`DROP INDEX IF EXISTS admin_audit_log_target_idx`);
  pgm.sql(`CREATE INDEX admin_audit_log_admin_idx ON admin_audit_log (admin_user_id, created_at DESC)`);
  pgm.sql(`CREATE INDEX admin_audit_log_action_idx ON admin_audit_log (action, created_at DESC)`);
  pgm.sql(
    `CREATE INDEX admin_audit_log_target_idx ON admin_audit_log (target_type, target_id, created_at DESC)`,
  );

  pgm.sql(`
    CREATE OR REPLACE FUNCTION admin_audit_log_append_only()
    RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'admin_audit_log is append-only';
    END;
    $$ LANGUAGE plpgsql;
  `);
  pgm.sql(`
    CREATE TRIGGER admin_audit_log_no_update
      BEFORE UPDATE ON admin_audit_log
      FOR EACH ROW EXECUTE FUNCTION admin_audit_log_append_only();
  `);
  pgm.sql(`
    CREATE TRIGGER admin_audit_log_no_delete
      BEFORE DELETE ON admin_audit_log
      FOR EACH ROW EXECUTE FUNCTION admin_audit_log_append_only();
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DROP TRIGGER IF EXISTS admin_audit_log_no_update ON admin_audit_log`);
  pgm.sql(`DROP TRIGGER IF EXISTS admin_audit_log_no_delete ON admin_audit_log`);
  pgm.sql(`DROP FUNCTION IF EXISTS admin_audit_log_append_only()`);

  pgm.sql(`DROP INDEX IF EXISTS admin_audit_log_admin_idx`);
  pgm.sql(`DROP INDEX IF EXISTS admin_audit_log_action_idx`);
  pgm.sql(`DROP INDEX IF EXISTS admin_audit_log_target_idx`);

  pgm.sql(`ALTER TABLE admin_audit_log DROP COLUMN IF EXISTS user_agent`);
  pgm.sql(`ALTER TABLE admin_audit_log RENAME COLUMN ip_address TO ip`);
  pgm.sql(`ALTER TABLE admin_audit_log ALTER COLUMN ip TYPE INET USING ip::inet`);
  pgm.sql(`ALTER TABLE admin_audit_log ALTER COLUMN metadata DROP NOT NULL`);
  pgm.sql(`ALTER TABLE admin_audit_log ALTER COLUMN metadata DROP DEFAULT`);
  pgm.sql(`ALTER TABLE admin_audit_log RENAME COLUMN metadata TO args`);
  pgm.sql(`ALTER TABLE admin_audit_log RENAME COLUMN admin_user_id TO actor_id`);
  pgm.sql(`ALTER TABLE admin_audit_log ALTER COLUMN actor_id SET NOT NULL`);

  pgm.sql(`CREATE INDEX admin_audit_log_created_idx ON admin_audit_log (created_at DESC)`);
  pgm.sql(`CREATE INDEX admin_audit_log_actor_idx ON admin_audit_log (actor_id, created_at DESC)`);
  pgm.sql(`CREATE INDEX admin_audit_log_target_idx ON admin_audit_log (target_type, target_id)`);
};
