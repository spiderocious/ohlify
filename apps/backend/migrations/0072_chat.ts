import type { MigrationBuilder } from 'node-pg-migrate';

// Calls revamp — Phase 6 (chat, REST-first). See docs/revamp/phases.md.
//
// A conversation is a 1:1 thread between a client and a professional. A user
// may only open/continue a conversation with a pro they hold minutes with
// (enforced in the service, not the schema, since balances can hit zero and
// the thread should persist read-only). Delivery is REST + polling; websocket
// realtime + message push are Phase 7.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TABLE conversations (
      id                  TEXT PRIMARY KEY,
      client_user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      professional_id     TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      last_message_at     TIMESTAMPTZ,
      last_message_preview TEXT,
      -- Unread counts are per side so each participant sees their own badge.
      client_unread       INT NOT NULL DEFAULT 0 CHECK (client_unread >= 0),
      professional_unread INT NOT NULL DEFAULT 0 CHECK (professional_unread >= 0),
      created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  // One thread per (client, professional) pair.
  pgm.sql(`
    CREATE UNIQUE INDEX conversations_pair_uniq
      ON conversations (client_user_id, professional_id)
  `);
  pgm.sql(`CREATE INDEX conversations_client_idx ON conversations (client_user_id, last_message_at DESC)`);
  pgm.sql(`CREATE INDEX conversations_pro_idx ON conversations (professional_id, last_message_at DESC)`);

  pgm.sql(`
    CREATE TABLE messages (
      id                  TEXT PRIMARY KEY,
      conversation_id     TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      body                TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
      created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  pgm.sql(`CREATE INDEX messages_conversation_idx ON messages (conversation_id, created_at DESC, id DESC)`);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DROP TABLE IF EXISTS messages`);
  pgm.sql(`DROP TABLE IF EXISTS conversations`);
};
