import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Normalises conversations from two hardcoded sides to a participant list.
 *
 * `conversations` pinned exactly two people into columns —
 * `client_user_id` / `professional_id`, with `client_unread` /
 * `professional_unread` beside them — so a third person was structurally
 * impossible, not merely unimplemented.
 *
 * Shape mirrors `call_participants` (migration 0094), which already solves the
 * same problem for calls: same role enum idea, same status lifecycle, same cap.
 * Keeping the two alike means the chat invite flow can reuse the call invite
 * rules the product already enforces.
 *
 * **The old columns are deliberately left in place.** Every read path is
 * migrated in this change, but a rollback would otherwise lose the unread
 * counts, and any query missed in review keeps working rather than silently
 * returning nothing. Drop them in a follow-up once this has run in production.
 */
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TYPE conversation_participant_role AS ENUM (
      'owner',        -- the client who started the thread; the only inviter
      'professional', -- the pro being consulted; approves guests
      'guest'         -- invited third party
    )
  `);

  pgm.sql(`
    CREATE TYPE conversation_participant_status AS ENUM (
      'pending_approval', -- invited; waiting on the professional
      'active',           -- in the thread, can read and post
      'rejected',         -- the professional said no
      'removed'           -- left, or was removed by the owner
    )
  `);

  pgm.sql(`
    CREATE TABLE conversation_participants (
      id              TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      role            conversation_participant_role NOT NULL,
      status          conversation_participant_status NOT NULL DEFAULT 'active',
      -- Per-participant, replacing the two named columns. Each person's badge
      -- is their own; a third participant needs a third counter.
      unread_count    INT NOT NULL DEFAULT 0 CHECK (unread_count >= 0),
      invited_by      TEXT REFERENCES users(id),
      joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
      left_at         TIMESTAMPTZ,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      -- A guest invited, removed, then re-invited reuses their row rather than
      -- accumulating history rows that every membership query would filter.
      UNIQUE (conversation_id, user_id),
      -- Mirrors call_participants: a guest must record who let them in.
      CHECK (role <> 'guest' OR invited_by IS NOT NULL)
    )
  `);

  pgm.sql(`
    CREATE INDEX conversation_participants_user_idx
      ON conversation_participants (user_id, status)
  `);
  pgm.sql(`
    CREATE INDEX conversation_participants_conversation_idx
      ON conversation_participants (conversation_id, status)
  `);

  // Backfill both existing sides, carrying their unread counts across so no
  // badge resets. `ON CONFLICT DO NOTHING` keeps this re-runnable.
  pgm.sql(`
    INSERT INTO conversation_participants
      (id, conversation_id, user_id, role, status, unread_count, joined_at, created_at)
    SELECT
      'cp_' || substr(md5(c.id || ':client'), 1, 24),
      c.id, c.client_user_id, 'owner', 'active', c.client_unread, c.created_at, c.created_at
    FROM conversations c
    ON CONFLICT (conversation_id, user_id) DO NOTHING
  `);

  pgm.sql(`
    INSERT INTO conversation_participants
      (id, conversation_id, user_id, role, status, unread_count, joined_at, created_at)
    SELECT
      'cp_' || substr(md5(c.id || ':pro'), 1, 24),
      c.id, c.professional_id, 'professional', 'active', c.professional_unread, c.created_at, c.created_at
    FROM conversations c
    ON CONFLICT (conversation_id, user_id) DO NOTHING
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  // The old columns were never dropped, so the pre-migration read paths still
  // work as soon as this table goes away.
  pgm.sql(`DROP TABLE IF EXISTS conversation_participants`);
  pgm.sql(`DROP TYPE IF EXISTS conversation_participant_status`);
  pgm.sql(`DROP TYPE IF EXISTS conversation_participant_role`);
};
