import type { MigrationBuilder } from 'node-pg-migrate';

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TABLE auth_sessions (
      id                  TEXT PRIMARY KEY,
      user_id             TEXT NOT NULL REFERENCES users(id),
      refresh_token_hash  TEXT UNIQUE NOT NULL,
      user_agent          TEXT,
      ip                  INET,
      device_id           TEXT,
      expires_at          TIMESTAMPTZ NOT NULL,
      revoked_at          TIMESTAMPTZ,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_used_at        TIMESTAMPTZ
    )
  `);
  pgm.sql('CREATE INDEX auth_sessions_user_idx ON auth_sessions (user_id) WHERE revoked_at IS NULL');
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql('DROP TABLE IF EXISTS auth_sessions');
};
