import type { PoolClient } from 'pg';

import { pool } from '@lib/db/pool.js';
import { id as makeId } from '@lib/ids.js';

import {
  ACTIVE_PARTICIPANT_STATUSES,
  ConversationParticipantStatus,
  OCCUPYING_PARTICIPANT_STATUSES,
  type ConversationParticipantRole,
  type ConversationParticipantRow,
  type ConversationParticipantView,
} from './conversation-participants.types.js';

interface QueryRunner {
  query: PoolClient['query'];
}

export const create = async (
  runner: QueryRunner,
  input: {
    conversationId: string;
    userId: string;
    role: ConversationParticipantRole;
    status: ConversationParticipantStatus;
    invitedBy?: string | null;
  },
): Promise<ConversationParticipantRow> => {
  const res = await runner.query<ConversationParticipantRow>(
    `INSERT INTO conversation_participants
       (id, conversation_id, user_id, role, status, invited_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     -- A guest who left and is re-invited reuses their row. Without this the
     -- unique constraint would reject the second invite outright.
     ON CONFLICT (conversation_id, user_id) DO UPDATE
       SET status     = EXCLUDED.status,
           role       = EXCLUDED.role,
           invited_by = EXCLUDED.invited_by,
           left_at    = NULL,
           joined_at  = now()
     RETURNING *`,
    [
      makeId('cp'),
      input.conversationId,
      input.userId,
      input.role,
      input.status,
      input.invitedBy ?? null,
    ],
  );
  return res.rows[0]!;
};

/** Everyone still holding a seat, with the names a roster needs to render. */
export const listForConversation = async (
  conversationId: string,
): Promise<ConversationParticipantView[]> => {
  const res = await pool.query<ConversationParticipantView>(
    `SELECT cp.id AS participant_id,
            cp.user_id,
            cp.role,
            cp.status,
            cp.invited_by,
            u.full_name,
            u.avatar_url
       FROM conversation_participants cp
       JOIN users u ON u.id = cp.user_id
      WHERE cp.conversation_id = $1
        AND cp.status = ANY($2::conversation_participant_status[])
      ORDER BY cp.joined_at ASC`,
    [conversationId, OCCUPYING_PARTICIPANT_STATUSES],
  );
  return res.rows;
};

export const findById = async (
  runner: QueryRunner,
  participantId: string,
): Promise<ConversationParticipantRow | null> => {
  const res = await runner.query<ConversationParticipantRow>(
    `SELECT * FROM conversation_participants WHERE id = $1 LIMIT 1`,
    [participantId],
  );
  return res.rows[0] ?? null;
};

/**
 * Locks the row before a decision. The professional approving at the same
 * moment the owner removes the guest must produce exactly one winner.
 */
export const findByIdForUpdate = async (
  runner: QueryRunner,
  participantId: string,
): Promise<ConversationParticipantRow | null> => {
  const res = await runner.query<ConversationParticipantRow>(
    `SELECT * FROM conversation_participants WHERE id = $1 LIMIT 1 FOR UPDATE`,
    [participantId],
  );
  return res.rows[0] ?? null;
};

export const findForUser = async (
  runner: QueryRunner,
  conversationId: string,
  userId: string,
): Promise<ConversationParticipantRow | null> => {
  const res = await runner.query<ConversationParticipantRow>(
    `SELECT * FROM conversation_participants
      WHERE conversation_id = $1 AND user_id = $2 LIMIT 1`,
    [conversationId, userId],
  );
  return res.rows[0] ?? null;
};

/** Seats taken, for the cap check. */
export const countOccupying = async (
  runner: QueryRunner,
  conversationId: string,
): Promise<number> => {
  const res = await runner.query<{ n: string }>(
    `SELECT count(*) AS n FROM conversation_participants
      WHERE conversation_id = $1
        AND status = ANY($2::conversation_participant_status[])`,
    [conversationId, OCCUPYING_PARTICIPANT_STATUSES],
  );
  return Number(res.rows[0]?.n ?? 0);
};

/**
 * Guarded status move. The `from` list is the concurrency guard: the loser of
 * a race matches nothing rather than overwriting a settled decision.
 */
export const transitionStatus = async (
  runner: QueryRunner,
  input: {
    participantId: string;
    from: ConversationParticipantStatus[];
    to: ConversationParticipantStatus;
  },
): Promise<ConversationParticipantRow | null> => {
  const leaving =
    input.to === ConversationParticipantStatus.REMOVED ||
    input.to === ConversationParticipantStatus.REJECTED;
  const res = await runner.query<ConversationParticipantRow>(
    `UPDATE conversation_participants
        SET status  = $3,
            left_at = CASE WHEN $4::boolean THEN now() ELSE left_at END
      WHERE id = $1
        AND status = ANY($2::conversation_participant_status[])
      RETURNING *`,
    [input.participantId, input.from, input.to, leaving],
  );
  return res.rows[0] ?? null;
};

/** Every user who should receive a new message — the sender excluded. */
export const listRecipients = async (
  runner: QueryRunner,
  conversationId: string,
  senderUserId: string,
): Promise<string[]> => {
  const res = await runner.query<{ user_id: string }>(
    `SELECT user_id FROM conversation_participants
      WHERE conversation_id = $1
        AND user_id <> $2
        AND status = ANY($3::conversation_participant_status[])`,
    [conversationId, senderUserId, ACTIVE_PARTICIPANT_STATUSES],
  );
  return res.rows.map((r) => r.user_id);
};

/**
 * Bumps everyone's unread except the sender's.
 *
 * Replaces the two named columns: with a third participant there is no "other
 * side" to increment, so the write is expressed as "everyone but me".
 */
export const bumpUnreadForOthers = async (
  runner: QueryRunner,
  conversationId: string,
  senderUserId: string,
): Promise<void> => {
  await runner.query(
    `UPDATE conversation_participants
        SET unread_count = unread_count + 1
      WHERE conversation_id = $1
        AND user_id <> $2
        AND status = ANY($3::conversation_participant_status[])`,
    [conversationId, senderUserId, ACTIVE_PARTICIPANT_STATUSES],
  );
};

export const clearUnread = async (
  runner: QueryRunner,
  conversationId: string,
  userId: string,
): Promise<void> => {
  await runner.query(
    `UPDATE conversation_participants
        SET unread_count = 0
      WHERE conversation_id = $1 AND user_id = $2`,
    [conversationId, userId],
  );
};

/** Total unread across every thread this user is still in. */
export const totalUnreadForUser = async (userId: string): Promise<number> => {
  const res = await pool.query<{ n: string }>(
    `SELECT COALESCE(sum(unread_count), 0) AS n
       FROM conversation_participants
      WHERE user_id = $1
        AND status = ANY($2::conversation_participant_status[])`,
    [userId, ACTIVE_PARTICIPANT_STATUSES],
  );
  return Number(res.rows[0]?.n ?? 0);
};
