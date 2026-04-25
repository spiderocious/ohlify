import type { MigrationBuilder } from 'node-pg-migrate';

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TABLE handle_redirects (
      old_handle   CITEXT PRIMARY KEY,
      user_id      TEXT NOT NULL REFERENCES users(id),
      expires_at   TIMESTAMPTZ NOT NULL,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  pgm.sql('CREATE INDEX handle_redirects_user_idx ON handle_redirects (user_id)');
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql('DROP TABLE IF EXISTS handle_redirects');
};
