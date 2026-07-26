import type { MigrationBuilder } from 'node-pg-migrate';

// Revamp-2 Phase 8 — three-party calls. See docs/revamp-2/prd.md §8.1.
//
// `instant_calls.caller_user_id` / `callee_user_id` STAY, and stay
// authoritative. They are what settlement reads, and the inviter-pays decision
// means the original caller funds the whole call regardless of who else joins.
// Making them nullable or moving billing onto this table would put the entire
// money path at risk for a feature that does not change the arithmetic.
//
// So `call_participants` is additive: the two original columns are backfilled
// into it as rows, and everything beyond two people lives only here.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TYPE call_participant_role AS ENUM ('caller', 'callee', 'invitee')
  `);
  pgm.sql(`
    CREATE TYPE call_participant_status AS ENUM (
      'pending_approval',
      'ringing',
      'joined',
      'left',
      'declined',
      'expired',
      'rejected'
    )
  `);

  pgm.sql(`
    CREATE TABLE call_participants (
      id           TEXT PRIMARY KEY,
      call_id      TEXT NOT NULL REFERENCES instant_calls(id) ON DELETE CASCADE,
      user_id      TEXT NOT NULL REFERENCES users(id),
      role         call_participant_role NOT NULL,
      status       call_participant_status NOT NULL,
      invited_by   TEXT REFERENCES users(id),
      agora_uid    INTEGER,
      joined_at    TIMESTAMPTZ,
      left_at      TIMESTAMPTZ,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT call_participants_unique_user UNIQUE (call_id, user_id)
    )
  `);

  // The invitee's ring and the professional's approval are two different waits,
  // and only an invitee has an inviter.
  pgm.sql(`
    ALTER TABLE call_participants
      ADD CONSTRAINT call_participants_invitee_has_inviter
      CHECK (role <> 'invitee' OR invited_by IS NOT NULL)
  `);

  pgm.sql(`CREATE INDEX call_participants_call_idx ON call_participants (call_id)`);
  pgm.sql(`
    CREATE INDEX call_participants_user_idx
      ON call_participants (user_id, created_at DESC)
  `);

  // Backfill both sides of every existing call. Status derives from whether
  // they joined — a call that ended without a join leaves 'left' either way,
  // which is accurate: they are not in the room now.
  pgm.sql(`
    INSERT INTO call_participants (id, call_id, user_id, role, status, agora_uid, joined_at, created_at)
    SELECT
      'cp_' || substr(md5(random()::text || c.id || 'caller'), 1, 24),
      c.id,
      c.caller_user_id,
      'caller',
      CASE
        WHEN c.status IN ('ringing') THEN 'joined'
        WHEN c.ended_at IS NOT NULL THEN 'left'
        WHEN c.caller_joined_at IS NOT NULL THEN 'joined'
        ELSE 'left'
      END::call_participant_status,
      NULL,
      c.caller_joined_at,
      c.created_at
    FROM instant_calls c
  `);
  pgm.sql(`
    INSERT INTO call_participants (id, call_id, user_id, role, status, agora_uid, joined_at, created_at)
    SELECT
      'cp_' || substr(md5(random()::text || c.id || 'callee'), 1, 24),
      c.id,
      c.callee_user_id,
      'callee',
      CASE
        WHEN c.status = 'ringing' THEN 'ringing'
        WHEN c.ended_at IS NOT NULL THEN 'left'
        WHEN c.callee_joined_at IS NOT NULL THEN 'joined'
        ELSE 'left'
      END::call_participant_status,
      NULL,
      c.callee_joined_at,
      c.created_at
    FROM instant_calls c
  `);

  // The one-live-call rule moves here, and now covers ANYONE in a live call —
  // not just the callee. An invitee already talking to one professional must
  // not be pulled into a second room.
  //
  // The old index stays too: it guards the same rule on the callee column that
  // settlement still reads, and dropping it would leave a window where a
  // participant row is missing but the call row exists.
  pgm.sql(`
    CREATE UNIQUE INDEX call_participants_one_live_per_user
      ON call_participants (user_id)
      WHERE status IN ('pending_approval', 'ringing', 'joined')
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DROP TABLE IF EXISTS call_participants`);
  pgm.sql(`DROP TYPE IF EXISTS call_participant_status`);
  pgm.sql(`DROP TYPE IF EXISTS call_participant_role`);
};
