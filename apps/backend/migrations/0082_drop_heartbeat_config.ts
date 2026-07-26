import type { MigrationBuilder } from 'node-pg-migrate';

// Revamp-2 Phase 2 — heartbeat is no longer a call gate. See docs/revamp-2/prd.md §2.4.
//
// Reachability now rests on a live push token plus the professional's own
// availability switch. A phone rings from a push whether or not the app is
// open, so a liveness ping had nothing left to decide — and keeping these keys
// visible in the admin config editor would imply a control that no longer does
// anything.
//
// `users.last_seen_at` stays: it is still written by ordinary auth activity and
// remains useful as a cosmetic "active recently" signal.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    DELETE FROM platform_config
     WHERE key IN (
       'presence.online_window_seconds',
       'presence.heartbeat_enabled',
       'presence.heartbeat_interval_seconds'
     )
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    INSERT INTO platform_config (key, value, is_public) VALUES
      ('presence.online_window_seconds', '60'::jsonb, FALSE),
      ('presence.heartbeat_enabled', 'true'::jsonb, TRUE),
      ('presence.heartbeat_interval_seconds', '30'::jsonb, TRUE)
    ON CONFLICT (key) DO NOTHING
  `);
};
