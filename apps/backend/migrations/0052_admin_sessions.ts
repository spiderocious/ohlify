import type { MigrationBuilder } from 'node-pg-migrate';

// Admin refresh-token sessions. One row per refresh token issued. Hashes
// the refresh token at rest so a DB leak doesn't grant session takeover.
//
// Sessions are revoked by setting `revoked_at`. Logout deletes nothing — it
// just sets revoked_at so the audit trail remains.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TABLE admin_sessions (
      id                    TEXT PRIMARY KEY,
      admin_user_id         TEXT NOT NULL REFERENCES admin_users(id),
      refresh_token_hash    TEXT NOT NULL,
      issued_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
      expires_at            TIMESTAMPTZ NOT NULL,
      revoked_at            TIMESTAMPTZ,
      last_seen_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
      user_agent            TEXT,
      ip_address            TEXT,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  pgm.sql(`CREATE INDEX admin_sessions_admin_idx ON admin_sessions (admin_user_id, issued_at DESC)`);
  pgm.sql(`CREATE UNIQUE INDEX admin_sessions_refresh_hash_idx ON admin_sessions (refresh_token_hash)`);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DROP TABLE IF EXISTS admin_sessions`);
};
