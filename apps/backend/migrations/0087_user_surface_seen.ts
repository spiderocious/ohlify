import type { MigrationBuilder } from 'node-pg-migrate';

// Revamp-2 Phase 3 — per-surface "last seen" markers. See docs/revamp-2/prd.md §3.3.
//
// Chats and the notification bell show precise counts, which their own tables
// already answer. Calls and Wallet show a DOT — "something happened since you
// last looked" — and that question needs a watermark, because there is no
// per-row read state for a call or a transaction and inventing one would be a
// concept the product does not have.
//
// A dot is then `count(rows newer than seen_at) > 0`.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TABLE user_surface_seen (
      user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      surface  TEXT NOT NULL CHECK (surface IN ('calls', 'wallet', 'chats', 'notifications')),
      seen_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, surface)
    )
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql('DROP TABLE IF EXISTS user_surface_seen');
};
