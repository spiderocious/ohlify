import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Push notification device tokens. One row per (user, raw token). The
 * outbox push adapter fans out per row matching the target user.
 *
 * Why the token itself is the natural key (not a synthetic id):
 *   - FCM rotates tokens on app reinstall / token refresh. The same
 *     device can land here twice; we de-dupe on the token string.
 *   - Logout deletes by token — easier than carrying around a row id.
 *
 * `platform` is one of ios | android | web. We don't model APNs vs FCM
 * separately because FCM's APNs gateway handles iOS too — every token
 * here is shipped to FCM Admin SDK regardless of platform.
 *
 * `last_seen_at` is bumped on each registration call so we can prune
 * stale tokens (e.g. uninstall + reinstall on the same device leaves
 * the old token dead — FCM will reject it and we can clean it up).
 */
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TABLE device_tokens (
      token         TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      platform      TEXT NOT NULL CHECK (platform IN ('ios','android','web')),
      app_version   TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(`CREATE INDEX device_tokens_user_idx ON device_tokens (user_id)`);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql('DROP TABLE IF EXISTS device_tokens');
};
