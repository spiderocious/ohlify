import type { MigrationBuilder } from 'node-pg-migrate';

// Seeds admin-tunable controls for the presence heartbeat feature.
//
// `presence.heartbeat_enabled` and `presence.heartbeat_interval_seconds` are
// `is_public = TRUE` — both mobile apps (React Native + Flutter) read them
// via GET /platform-config/public on boot to decide whether to run the
// heartbeat timer at all, and at what interval. This is the dead switch: an
// operator can flip heartbeat_enabled to false to stop both clients from
// ever calling POST /me/presence/heartbeat, without a client release.
//
// `presence.online_window_seconds` already existed as a compiled-in default
// (platform-config.service.ts DEFAULT_SNAPSHOT) but was never seeded in the
// DB, so it was not actually admin-tunable — this migration seeds it too so
// it round-trips through the admin config UI. It stays `is_public = FALSE`:
// it's a server-side reachability threshold (how stale a heartbeat can be
// before a pro is considered offline), not something either client needs to
// read directly.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    INSERT INTO platform_config (key, value, is_public) VALUES
      ('presence.heartbeat_enabled', 'true'::jsonb, TRUE),
      ('presence.heartbeat_interval_seconds', '30'::jsonb, TRUE),
      ('presence.online_window_seconds', '60'::jsonb, FALSE)
    ON CONFLICT (key) DO NOTHING
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    DELETE FROM platform_config WHERE key IN (
      'presence.heartbeat_enabled',
      'presence.heartbeat_interval_seconds',
      'presence.online_window_seconds'
    )
  `);
};
