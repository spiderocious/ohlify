import type { PoolClient } from 'pg';

import { queueProDashboardInvalidation } from '@features/professionals/pro-dashboard.cache.js';
import { pool } from '@lib/db/pool.js';
import { id as makeId } from '@lib/ids.js';

import * as participantsRepo from './conversation-participants.repo.js';

import type {
  CallEventPayload,
  ConversationListRow,
  ConversationRow,
  MessageRow,
  ScheduleStatus,
} from './chat.types.js';

interface QueryRunner {
  query: PoolClient['query'];
}

export const findConversationById = async (
  conversationId: string,
): Promise<ConversationRow | null> => {
  const res = await pool.query<ConversationRow>(
    `SELECT * FROM conversations WHERE id = $1 LIMIT 1`,
    [conversationId],
  );
  return res.rows[0] ?? null;
};

export const findConversationByIdForUpdate = async (
  runner: QueryRunner,
  conversationId: string,
): Promise<ConversationRow | null> => {
  const res = await runner.query<ConversationRow>(
    `SELECT * FROM conversations WHERE id = $1 LIMIT 1 FOR UPDATE`,
    [conversationId],
  );
  return res.rows[0] ?? null;
};

// Upsert the (client, professional) conversation; returns the row.
export const ensureConversation = async (
  runner: QueryRunner,
  clientUserId: string,
  professionalId: string,
): Promise<ConversationRow> => {
  const res = await runner.query<ConversationRow>(
    `INSERT INTO conversations (id, client_user_id, professional_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (client_user_id, professional_id) DO UPDATE SET updated_at = now()
     RETURNING *`,
    [makeId('conv'), clientUserId, professionalId],
  );
  const conversation = res.rows[0]!;

  // Both original sides become participant rows in the same statement path as
  // the conversation. Membership is read from here, so a thread without them
  // would be invisible to the two people in it. Idempotent, because
  // ensureConversation is called on every open, not just the first.
  await runner.query(
    `INSERT INTO conversation_participants
       (id, conversation_id, user_id, role, status)
     VALUES ($1, $2, $3, 'owner', 'active'),
            ($4, $2, $5, 'professional', 'active')
     ON CONFLICT (conversation_id, user_id) DO NOTHING`,
    [makeId('cp'), conversation.id, clientUserId, makeId('cp'), professionalId],
  );

  return conversation;
};

/**
 * A user's conversations, newest activity first.
 *
 * Membership comes from `conversation_participants`, not the two columns on
 * `conversations` — a guest is in neither of them and would otherwise see no
 * threads at all.
 *
 * `peer_*` still describes ONE counterpart, chosen as the professional (or,
 * when the viewer is the professional, the owner). In a 3-person thread the
 * list row keeps showing that person while the full roster travels separately
 * on the thread view, so a two-person list UI needs no changes to keep working.
 *
 * `unread_count` comes from the viewer's own participant row, which is what
 * makes a third badge possible.
 */
export const listConversationsForUser = async (
  userId: string,
  limit: number,
  beforeIso: string | null,
): Promise<ConversationListRow[]> => {
  const params: unknown[] = [userId];
  let cursorClause = '';
  if (beforeIso) {
    params.push(beforeIso);
    cursorClause = `AND c.last_message_at < $${params.length}`;
  }
  params.push(limit);
  const res = await pool.query<ConversationListRow>(
    `SELECT c.*,
            me.unread_count AS viewer_unread,
            peer.user_id    AS peer_user_id,
            u.full_name     AS peer_name,
            u.avatar_url    AS peer_avatar_url,
            -- Presence, so a thread row can show whether the peer is
            -- reachable. The users table is already joined for the name and
            -- avatar, so this costs nothing extra — and PRD 4.2 requires list
            -- rows to carry enough that opening one never shows a spinner.
            u.is_available  AS peer_is_available
       FROM conversations c
       JOIN conversation_participants me
         ON me.conversation_id = c.id
        AND me.user_id = $1
        AND me.status = 'active'
       -- The counterpart to show in the list: the professional, unless the
       -- viewer IS the professional, in which case the thread's owner.
       JOIN LATERAL (
         SELECT p.user_id
           FROM conversation_participants p
          WHERE p.conversation_id = c.id
            AND p.user_id <> $1
            AND p.status = 'active'
          ORDER BY CASE p.role WHEN 'professional' THEN 0 WHEN 'owner' THEN 1 ELSE 2 END,
                   p.joined_at ASC
          LIMIT 1
       ) peer ON TRUE
       JOIN users u ON u.id = peer.user_id
      WHERE c.last_message_at IS NOT NULL
        ${cursorClause}
      ORDER BY c.last_message_at DESC
      LIMIT $${params.length}`,
    params,
  );
  return res.rows;
};

export const listMessages = async (
  conversationId: string,
  limit: number,
  beforeId: string | null,
): Promise<MessageRow[]> => {
  const params: unknown[] = [conversationId];
  let cursorClause = '';
  if (beforeId) {
    params.push(beforeId);
    cursorClause = `AND id < $${params.length}`;
  }
  params.push(limit);
  const res = await pool.query<MessageRow>(
    `SELECT * FROM messages
      WHERE conversation_id = $1 ${cursorClause}
      ORDER BY created_at DESC, id DESC
      LIMIT $${params.length}`,
    params,
  );
  return res.rows;
};

export const insertMessage = async (
  runner: QueryRunner,
  conversationId: string,
  senderUserId: string,
  body: string,
): Promise<MessageRow> => {
  const res = await runner.query<MessageRow>(
    `INSERT INTO messages (id, conversation_id, sender_user_id, body)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [makeId('msg'), conversationId, senderUserId, body],
  );
  return res.rows[0]!;
};

// A schedule proposal lands as a message with kind='schedule'.
export const insertScheduleMessage = async (
  runner: QueryRunner,
  conversationId: string,
  senderUserId: string,
  body: string,
  scheduledAt: Date,
): Promise<MessageRow> => {
  const res = await runner.query<MessageRow>(
    `INSERT INTO messages
       (id, conversation_id, sender_user_id, body, kind, scheduled_at, schedule_status)
     VALUES ($1, $2, $3, $4, 'schedule', $5, 'pending')
     RETURNING *`,
    [makeId('msg'), conversationId, senderUserId, body, scheduledAt],
  );
  return res.rows[0]!;
};

/**
 * Writes a call into the thread.
 *
 * The sender is the CALLER, so the bubble sits on the right side for whoever
 * placed it — matching how every messenger renders this, and how the two
 * parties actually remember the call.
 */
export const insertCallEventMessage = async (
  runner: QueryRunner,
  input: {
    conversationId: string;
    callerUserId: string;
    body: string;
    callEvent: CallEventPayload;
  },
): Promise<MessageRow> => {
  const res = await runner.query<MessageRow>(
    `INSERT INTO messages
       (id, conversation_id, sender_user_id, body, kind, call_event)
     VALUES ($1, $2, $3, $4, 'call_event', $5)
     RETURNING *`,
    [
      makeId('msg'),
      input.conversationId,
      input.callerUserId,
      input.body,
      JSON.stringify(input.callEvent),
    ],
  );
  return res.rows[0]!;
};

export const findMessageForUpdate = async (
  runner: QueryRunner,
  messageId: string,
): Promise<MessageRow | null> => {
  const res = await runner.query<MessageRow>(
    `SELECT * FROM messages WHERE id = $1 LIMIT 1 FOR UPDATE`,
    [messageId],
  );
  return res.rows[0] ?? null;
};

/** Which conversation a message belongs to (used by reschedule). */
export const findConversationOfMessage = async (
  messageId: string,
): Promise<{ conversation_id: string } | null> => {
  const res = await pool.query<{ conversation_id: string }>(
    `SELECT conversation_id FROM messages WHERE id = $1 LIMIT 1`,
    [messageId],
  );
  return res.rows[0] ?? null;
};

export const updateScheduleStatus = async (
  runner: QueryRunner,
  messageId: string,
  status: ScheduleStatus,
): Promise<MessageRow> => {
  const res = await runner.query<MessageRow>(
    `UPDATE messages
        SET schedule_status = $2
      WHERE id = $1 AND kind = 'schedule'
      RETURNING *`,
    [messageId, status],
  );
  const updated = res.rows[0]!;
  // A proposal leaving `pending` changes the dashboard's scheduled-call count.
  // The conversation is read back rather than passed in because every caller
  // already holds the message id and not all of them hold the conversation.
  const convo = await runner.query<{ professional_id: string }>(
    `SELECT professional_id FROM conversations WHERE id = $1`,
    [updated.conversation_id],
  );
  const professionalId = convo.rows[0]?.professional_id;
  if (professionalId !== undefined) {
    queueProDashboardInvalidation(runner, professionalId);
  }
  return updated;
};

/** The conversation's live (pending/accepted) schedule, if any — for the list hint. */
export const findActiveSchedule = async (conversationId: string): Promise<MessageRow | null> => {
  const res = await pool.query<MessageRow>(
    `SELECT * FROM messages
      WHERE conversation_id = $1
        AND kind = 'schedule'
        AND schedule_status IN ('pending', 'accepted')
      ORDER BY scheduled_at ASC
      LIMIT 1`,
    [conversationId],
  );
  return res.rows[0] ?? null;
};

/**
 * Bumps last-message metadata and every recipient's unread counter.
 *
 * The counter moved to `conversation_participants`: with three people there is
 * no single "other side" to increment, so the write is "everyone but the
 * sender". The two legacy columns are left untouched and unread — they exist
 * only so a rollback still has its data.
 */
export const bumpAfterMessage = async (
  runner: QueryRunner,
  conversation: ConversationRow,
  senderUserId: string,
  preview: string,
): Promise<void> => {
  await runner.query(
    `UPDATE conversations
        SET last_message_at = now(),
            last_message_preview = $2,
            updated_at = now()
      WHERE id = $1`,
    [conversation.id, preview.slice(0, 140)],
  );
  await participantsRepo.bumpUnreadForOthers(runner, conversation.id, senderUserId);
  // `unread_messages` on the professional's dashboard just changed. Only the
  // professional's own dashboard exists, so only theirs is busted — and only
  // when someone else sent the message, since a pro's own message does not
  // raise their unread count.
  if (conversation.professional_id !== senderUserId) {
    queueProDashboardInvalidation(runner, conversation.professional_id);
  }
};

/** Clears the viewer's own unread counter for a conversation. */
export const markRead = async (
  runner: QueryRunner,
  conversation: ConversationRow,
  viewerUserId: string,
): Promise<void> => {
  await participantsRepo.clearUnread(runner, conversation.id, viewerUserId);
  await runner.query(`UPDATE conversations SET updated_at = now() WHERE id = $1`, [
    conversation.id,
  ]);
  // Reading clears the count, which is the same figure rising did. Without
  // this the dashboard keeps advertising messages the professional has just
  // read — the exact bug the pre-Hawk badge shipped with.
  if (conversation.professional_id === viewerUserId) {
    queueProDashboardInvalidation(runner, viewerUserId);
  }
};

/**
 * Total unread across every thread this user is still in.
 *
 * Reads participant rows rather than the two legacy columns, so a guest's
 * unread counts toward their badge like anyone else's.
 */
export const totalUnreadForUser = (userId: string): Promise<number> =>
  participantsRepo.totalUnreadForUser(userId);
