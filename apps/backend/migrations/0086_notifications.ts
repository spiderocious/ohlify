import type { MigrationBuilder } from 'node-pg-migrate';

// Revamp-2 Phase 3 — durable in-app notifications. See docs/revamp-2/prd.md §3.1.
//
// The panel is for things that happened to you that you would want to find
// again and that have NO other natural home: money exceptions, account status,
// moderation, campaigns, social. Routine activity — new messages, missed calls,
// ordinary wallet movements — deliberately writes NOTHING here. The Chats tab,
// Calls tab, and wallet history already are those records, and duplicating them
// makes the panel unreadable. Those surface as badges instead.
//
// Every row carries a deeplink: the panel is a router into the app, not a
// content surface.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TABLE notifications (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind        TEXT NOT NULL,
      title       TEXT NOT NULL,
      body        TEXT,
      -- Encoded as target?key=value (see lib/deeplink.ts). Stored rather than
      -- derived so a row written today still resolves after the screen it
      -- points at is renamed.
      deeplink    TEXT,
      metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
      read_at     TIMESTAMPTZ,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // The panel reads newest-first for one user; the badge counts unread.
  pgm.sql(`
    CREATE INDEX notifications_user_created_idx
      ON notifications (user_id, created_at DESC, id DESC)
  `);
  pgm.sql(`
    CREATE INDEX notifications_unread_idx
      ON notifications (user_id)
      WHERE read_at IS NULL
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql('DROP TABLE IF EXISTS notifications');
};
