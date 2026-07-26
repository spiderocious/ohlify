import type { MigrationBuilder } from 'node-pg-migrate';

// Revamp-2 Phase 2 — device telemetry. See docs/revamp-2/prd.md §2.3.
//
// `auth_sessions` already carried `user_agent`, `ip`, and `device_id`, but a
// user-agent string has to be parsed to answer anything, and parsing it is
// guesswork on React Native. Structured columns instead, so Phase 5's segment
// predicates can filter on platform and app version directly.
//
// All nullable: a login from a client that sends nothing must still succeed.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    ALTER TABLE auth_sessions
      ADD COLUMN platform      TEXT CHECK (platform IN ('ios','android','web')),
      ADD COLUMN app_version   TEXT,
      ADD COLUMN device_name   TEXT,
      ADD COLUMN device_model  TEXT,
      ADD COLUMN os_version    TEXT
  `);

  // Segment targeting asks "who is on an old build?" across live sessions.
  pgm.sql(`
    CREATE INDEX auth_sessions_platform_version_idx
      ON auth_sessions (platform, app_version)
      WHERE revoked_at IS NULL
  `);

  // device_tokens already had platform + app_version; round it out so the push
  // side can answer the same questions as the session side.
  pgm.sql(`
    ALTER TABLE device_tokens
      ADD COLUMN device_name  TEXT,
      ADD COLUMN device_model TEXT,
      ADD COLUMN os_version   TEXT
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    ALTER TABLE device_tokens
      DROP COLUMN IF EXISTS os_version,
      DROP COLUMN IF EXISTS device_model,
      DROP COLUMN IF EXISTS device_name
  `);
  pgm.sql('DROP INDEX IF EXISTS auth_sessions_platform_version_idx');
  pgm.sql(`
    ALTER TABLE auth_sessions
      DROP COLUMN IF EXISTS os_version,
      DROP COLUMN IF EXISTS device_model,
      DROP COLUMN IF EXISTS device_name,
      DROP COLUMN IF EXISTS app_version,
      DROP COLUMN IF EXISTS platform
  `);
};
