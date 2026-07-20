import type { MigrationBuilder } from 'node-pg-migrate';

// `presence.ring_timeout_seconds` already existed as a compiled-in default
// (platform-config.service.ts DEFAULT_SNAPSHOT) but, like
// online_window_seconds before migration 0076, was never seeded in the DB —
// so despite having an admin-registry entry it never actually appeared in
// the config UI. Server-only: not exposed to either mobile client.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    INSERT INTO platform_config (key, value, is_public) VALUES
      ('presence.ring_timeout_seconds', '30'::jsonb, FALSE)
    ON CONFLICT (key) DO NOTHING
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DELETE FROM platform_config WHERE key = 'presence.ring_timeout_seconds'`);
};
