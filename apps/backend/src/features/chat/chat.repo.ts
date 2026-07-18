import type { PoolClient } from 'pg';

import { pool } from '@lib/db/pool.js';
import { id as makeId } from '@lib/ids.js';

import type {
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
  return res.rows[0]!;
};

// Lists a user's conversations (as client OR professional), newest activity
// first, with the other participant's display fields + the viewer's unread.
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
            CASE WHEN c.client_user_id = $1 THEN c.professional_id ELSE c.client_user_id END AS peer_user_id,
            u.full_name  AS peer_name,
            u.avatar_url AS peer_avatar_url
       FROM conversations c
       JOIN users u
         ON u.id = CASE WHEN c.client_user_id = $1 THEN c.professional_id ELSE c.client_user_id END
      WHERE (c.client_user_id = $1 OR c.professional_id = $1)
        AND c.last_message_at IS NOT NULL
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
  return res.rows[0]!;
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

// Bumps last-message metadata + increments the RECIPIENT's unread counter.
export const bumpAfterMessage = async (
  runner: QueryRunner,
  conversation: ConversationRow,
  senderUserId: string,
  preview: string,
): Promise<void> => {
  const senderIsClient = conversation.client_user_id === senderUserId;
  // Recipient's unread goes up; sender's own count is untouched.
  const unreadColumn = senderIsClient ? 'professional_unread' : 'client_unread';
  await runner.query(
    `UPDATE conversations
        SET last_message_at = now(),
            last_message_preview = $2,
            ${unreadColumn} = ${unreadColumn} + 1,
            updated_at = now()
      WHERE id = $1`,
    [conversation.id, preview.slice(0, 140)],
  );
};

// Clears the viewer's unread counter for a conversation.
export const markRead = async (
  runner: QueryRunner,
  conversation: ConversationRow,
  viewerUserId: string,
): Promise<void> => {
  const viewerIsClient = conversation.client_user_id === viewerUserId;
  const column = viewerIsClient ? 'client_unread' : 'professional_unread';
  await runner.query(`UPDATE conversations SET ${column} = 0, updated_at = now() WHERE id = $1`, [
    conversation.id,
  ]);
};

export const totalUnreadForUser = async (userId: string): Promise<number> => {
  const res = await pool.query<{ total: string }>(
    `SELECT COALESCE(SUM(
              CASE WHEN client_user_id = $1 THEN client_unread
                   WHEN professional_id = $1 THEN professional_unread
                   ELSE 0 END), 0)::text AS total
       FROM conversations
      WHERE client_user_id = $1 OR professional_id = $1`,
    [userId],
  );
  return Number(res.rows[0]?.total ?? '0');
};
