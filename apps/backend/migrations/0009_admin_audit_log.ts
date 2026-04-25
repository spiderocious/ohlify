import type { MigrationBuilder } from 'node-pg-migrate';

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TABLE admin_audit_log (
      id            TEXT PRIMARY KEY,
      actor_id      TEXT NOT NULL REFERENCES admin_users(id),
      action        TEXT NOT NULL,
      target_type   TEXT,
      target_id     TEXT,
      args          JSONB,
      note          TEXT,
      ip            INET,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(`CREATE INDEX admin_audit_log_created_idx ON admin_audit_log (created_at DESC)`);
  pgm.sql(`CREATE INDEX admin_audit_log_actor_idx ON admin_audit_log (actor_id, created_at DESC)`);
  pgm.sql(`CREATE INDEX admin_audit_log_target_idx ON admin_audit_log (target_type, target_id)`);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql('DROP TABLE IF EXISTS admin_audit_log');
};
