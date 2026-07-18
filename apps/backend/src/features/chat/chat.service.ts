import * as authRepo from '@features/auth/auth.repo.js';
import * as minutesRepo from '@features/minutes/minutes.repo.js';
import { platformConfig } from '@lib/config/platform-config.service.js';
import { withTransaction } from '@lib/db/tx.js';
import { encodeCursor, resolveLimit } from '@lib/pagination.js';
import { ServiceError, ServiceSuccess } from '@lib/service-result.js';

import { CHAT_MESSAGES } from './chat.messages.js';
import * as repo from './chat.repo.js';
import {
  MessageKind,
  ScheduleStatus,
  TERMINAL_SCHEDULE_STATUSES,
  type ConversationListRow,
  type ConversationRow,
  type MessageRow,
  type MessageView,
} from './chat.types.js';

const toConversationView = (row: ConversationListRow, viewerUserId: string) => {
  const viewerIsClient = row.client_user_id === viewerUserId;
  return {
    id: row.id,
    peer_user_id: row.peer_user_id,
    peer_name: row.peer_name,
    peer_avatar_url: row.peer_avatar_url,
    last_message_at: row.last_message_at ? row.last_message_at.toISOString() : null,
    last_message_preview: row.last_message_preview,
    unread_count: viewerIsClient ? row.client_unread : row.professional_unread,
    created_at: row.created_at.toISOString(),
  };
};

const toMessageView = (row: MessageRow, viewerUserId: string): MessageView => {
  const mine = row.sender_user_id === viewerUserId;
  const isSchedule = row.kind === MessageKind.SCHEDULE;
  const pending = isSchedule && row.schedule_status === ScheduleStatus.PENDING;
  const accepted = isSchedule && row.schedule_status === ScheduleStatus.ACCEPTED;
  // Invitee (the party who did NOT propose) accepts/declines a pending invite.
  // The proposer can reschedule or cancel while it's still live.
  const live = pending || accepted;
  return {
    id: row.id,
    conversation_id: row.conversation_id,
    sender_user_id: row.sender_user_id,
    mine,
    body: row.body,
    kind: row.kind,
    scheduled_at: row.scheduled_at ? row.scheduled_at.toISOString() : null,
    schedule_status: row.schedule_status,
    can_accept: pending && !mine,
    can_decline: pending && !mine,
    can_reschedule: live && mine,
    can_cancel: live && mine,
    created_at: row.created_at.toISOString(),
  };
};

// The chat gate: a client may chat with a pro only while holding minutes > 0
// with them (any call type). Returns null when allowed.
const assertHasMinutes = async (
  clientUserId: string,
  professionalId: string,
): Promise<ServiceError | null> => {
  const balances = await minutesRepo.listBalancesForUser(clientUserId);
  const hasMinutes = balances.some(
    (b) => b.professional_id === professionalId && b.minutes_remaining > 0,
  );
  if (!hasMinutes) {
    return new ServiceError('forbidden', CHAT_MESSAGES.NEEDS_MINUTES, 403);
  }
  return null;
};

// Ensures the viewer is a participant of the conversation.
const assertParticipant = (conversation: ConversationRow, userId: string): ServiceError | null => {
  if (conversation.client_user_id !== userId && conversation.professional_id !== userId) {
    return new ServiceError('not_found', CHAT_MESSAGES.NOT_FOUND, 404);
  }
  return null;
};

export const listConversations = async (
  userId: string,
  limit: number | undefined,
  cursorIso: string | null,
) => {
  const lim = resolveLimit(limit);
  const rows = await repo.listConversationsForUser(userId, lim + 1, cursorIso);
  const hasMore = rows.length > lim;
  const page = hasMore ? rows.slice(0, lim) : rows;
  const last = page[page.length - 1];
  return new ServiceSuccess(
    {
      items: page.map((r) => toConversationView(r, userId)),
      meta: {
        next_cursor:
          hasMore && last?.last_message_at
            ? encodeCursor({
                last_id: last.id,
                last_sort_key: last.last_message_at.toISOString(),
              })
            : null,
        has_more: hasMore,
      },
    },
    CHAT_MESSAGES.CONVERSATIONS_FETCHED,
  );
};

// Open (or resume) a conversation with a professional. Gated on minutes > 0.
export const openConversation = async (clientUserId: string, professionalId: string) => {
  if (professionalId === clientUserId) {
    return new ServiceError('validation_error', CHAT_MESSAGES.CANNOT_CHAT_SELF, 422);
  }
  const pro = await authRepo.findUserById(professionalId);
  if (!pro || pro.role !== 'professional' || pro.deleted_at !== null) {
    return new ServiceError('not_found', CHAT_MESSAGES.PRO_NOT_FOUND, 404);
  }
  const gate = await assertHasMinutes(clientUserId, professionalId);
  if (gate) return gate;

  const conv = await withTransaction((client) =>
    repo.ensureConversation(client, clientUserId, professionalId),
  );
  return new ServiceSuccess(
    { id: conv.id, professional_id: professionalId },
    CHAT_MESSAGES.CONVERSATION_OPENED,
  );
};

/**
 * Everything the thread screen needs besides the messages: who the peer is, how
 * many minutes the client still holds with the pro (drives the "credits running
 * low / out" banner above the composer), the low-minutes threshold, and whether
 * a schedule is live.
 */
export const getConversationContext = async (conversationId: string, userId: string) => {
  const conv = await repo.findConversationById(conversationId);
  if (!conv) return new ServiceError('not_found', CHAT_MESSAGES.NOT_FOUND, 404);
  const notMine = assertParticipant(conv, userId);
  if (notMine) return notMine;

  const viewerIsClient = conv.client_user_id === userId;
  const peerUserId = viewerIsClient ? conv.professional_id : conv.client_user_id;

  // Minutes are always held by the CLIENT against the PRO, regardless of viewer.
  const balances = await minutesRepo.listBalancesForUser(conv.client_user_id);
  const minutesRemaining = balances
    .filter((b) => b.professional_id === conv.professional_id)
    .reduce((sum, b) => sum + b.minutes_remaining, 0);

  const peer = await authRepo.findUserById(peerUserId);
  const activeSchedule = await repo.findActiveSchedule(conversationId);

  return new ServiceSuccess(
    {
      id: conv.id,
      peer_user_id: peerUserId,
      peer_name: peer?.full_name ?? null,
      peer_avatar_url: peer?.avatar_url ?? null,
      /** The viewer is the paying side (and so is subject to the minutes gate). */
      viewer_is_client: viewerIsClient,
      minutes_remaining: minutesRemaining,
      low_minutes_threshold: platformConfig.chat().low_minutes_threshold,
      /** Client can only send while they hold minutes; the pro can always reply. */
      can_send: viewerIsClient ? minutesRemaining > 0 : true,
      active_schedule: activeSchedule ? toMessageView(activeSchedule, userId) : null,
    },
    CHAT_MESSAGES.CONTEXT_FETCHED,
  );
};

export const listMessages = async (
  conversationId: string,
  userId: string,
  limit: number | undefined,
  beforeId: string | null,
) => {
  const conv = await repo.findConversationById(conversationId);
  if (!conv) return new ServiceError('not_found', CHAT_MESSAGES.NOT_FOUND, 404);
  const notMine = assertParticipant(conv, userId);
  if (notMine) return notMine;

  const lim = resolveLimit(limit);
  const rows = await repo.listMessages(conversationId, lim + 1, beforeId);
  const hasMore = rows.length > lim;
  const page = hasMore ? rows.slice(0, lim) : rows;
  const last = page[page.length - 1];
  return new ServiceSuccess(
    {
      items: page.map((r) => toMessageView(r, userId)),
      meta: {
        next_cursor:
          hasMore && last ? encodeCursor({ last_id: last.id, last_sort_key: last.id }) : null,
        has_more: hasMore,
      },
    },
    CHAT_MESSAGES.MESSAGES_FETCHED,
  );
};

export const sendMessage = async (conversationId: string, senderUserId: string, body: string) => {
  return withTransaction(async (client) => {
    const conv = await repo.findConversationByIdForUpdate(client, conversationId);
    if (!conv) return new ServiceError('not_found', CHAT_MESSAGES.NOT_FOUND, 404);
    const notMine = assertParticipant(conv, senderUserId);
    if (notMine) return notMine;

    // The client side must still hold minutes to keep messaging. The pro can
    // always reply to an existing thread.
    if (conv.client_user_id === senderUserId) {
      const gate = await assertHasMinutes(senderUserId, conv.professional_id);
      if (gate) return gate;
    }

    const msg = await repo.insertMessage(client, conversationId, senderUserId, body);
    await repo.bumpAfterMessage(client, conv, senderUserId, body);
    return new ServiceSuccess(toMessageView(msg, senderUserId), CHAT_MESSAGES.MESSAGE_SENT);
  });
};

// ── Schedule-from-chat ──────────────────────────────────────────────────────
// A scheduled call is a chat-native marker (message kind='schedule'), NOT the
// old bookings flow. Either party can propose. Purely informational until
// notifications land — the card's Join button starts a normal instant call.

/** Propose a call time. Either party may schedule; the client still needs minutes. */
export const proposeSchedule = async (
  conversationId: string,
  senderUserId: string,
  scheduledAtIso: string,
  note: string | undefined,
) => {
  const when = new Date(scheduledAtIso);
  if (Number.isNaN(when.getTime())) {
    return new ServiceError('validation_error', CHAT_MESSAGES.SCHEDULE_INVALID_TIME, 422, {
      scheduled_at: ['Provide a valid ISO 8601 timestamp'],
    });
  }
  if (when.getTime() <= Date.now()) {
    return new ServiceError('validation_error', CHAT_MESSAGES.SCHEDULE_IN_PAST, 422, {
      scheduled_at: ['Pick a time in the future'],
    });
  }

  return withTransaction(async (client) => {
    const conv = await repo.findConversationByIdForUpdate(client, conversationId);
    if (!conv) return new ServiceError('not_found', CHAT_MESSAGES.NOT_FOUND, 404);
    const notMine = assertParticipant(conv, senderUserId);
    if (notMine) return notMine;

    // Same gate as sending: the client must hold minutes; the pro may always act.
    if (conv.client_user_id === senderUserId) {
      const gate = await assertHasMinutes(senderUserId, conv.professional_id);
      if (gate) return gate;
    }

    const body = note?.trim() ? note.trim() : 'Proposed a call';
    const msg = await repo.insertScheduleMessage(client, conversationId, senderUserId, body, when);
    await repo.bumpAfterMessage(client, conv, senderUserId, `📅 ${body}`);
    return new ServiceSuccess(toMessageView(msg, senderUserId), CHAT_MESSAGES.SCHEDULE_PROPOSED);
  });
};

type ScheduleAction = 'accept' | 'decline' | 'cancel';

const statusFor = (action: ScheduleAction): ScheduleStatus => {
  if (action === 'accept') return ScheduleStatus.ACCEPTED;
  if (action === 'decline') return ScheduleStatus.DECLINED;
  return ScheduleStatus.CANCELLED;
};

// Accept/decline (invitee only) or cancel (proposer only) a live schedule.
export const actOnSchedule = async (messageId: string, userId: string, action: ScheduleAction) => {
  return withTransaction(async (client) => {
    const msg = await repo.findMessageForUpdate(client, messageId);
    if (!msg || msg.kind !== MessageKind.SCHEDULE) {
      return new ServiceError('not_found', CHAT_MESSAGES.SCHEDULE_NOT_FOUND, 404);
    }
    const conv = await repo.findConversationByIdForUpdate(client, msg.conversation_id);
    if (!conv) return new ServiceError('not_found', CHAT_MESSAGES.NOT_FOUND, 404);
    const notMine = assertParticipant(conv, userId);
    if (notMine) return notMine;

    const status = msg.schedule_status;
    if (status === null || TERMINAL_SCHEDULE_STATUSES.includes(status)) {
      return new ServiceError('conflict', CHAT_MESSAGES.SCHEDULE_NOT_ACTIONABLE, 409);
    }

    const isProposer = msg.sender_user_id === userId;
    const permitted = permittedScheduleAction(action, isProposer, status);
    if (!permitted) {
      return new ServiceError('forbidden', CHAT_MESSAGES.SCHEDULE_NOT_ACTIONABLE, 403);
    }

    const updated = await repo.updateScheduleStatus(client, messageId, statusFor(action));
    return new ServiceSuccess(toMessageView(updated, userId), CHAT_MESSAGES.SCHEDULE_UPDATED);
  });
};

// Accept/decline: invitee only, and only while pending.
// Cancel: proposer only, while pending or accepted.
const permittedScheduleAction = (
  action: ScheduleAction,
  isProposer: boolean,
  status: ScheduleStatus,
): boolean => {
  if (action === 'cancel') return isProposer;
  return !isProposer && status === ScheduleStatus.PENDING;
};

/**
 * Reschedule = cancel the old proposal + raise a fresh one at the new time.
 * Only the proposer may reschedule (per the agreed action menu).
 */
export const reschedule = async (
  messageId: string,
  userId: string,
  scheduledAtIso: string,
  note: string | undefined,
) => {
  const existing = await repo.findConversationOfMessage(messageId);
  if (!existing) {
    return new ServiceError('not_found', CHAT_MESSAGES.SCHEDULE_NOT_FOUND, 404);
  }
  // Validate the NEW time BEFORE cancelling the old card. Previously cancel
  // committed in its own transaction and then proposeSchedule validated the
  // time in a second transaction — so a past/invalid new time left the original
  // permanently cancelled with no replacement (silent data loss). These are the
  // same checks proposeSchedule runs; doing them first makes an invalid
  // reschedule a no-op instead. (BUGS.md D1.)
  const when = new Date(scheduledAtIso);
  if (Number.isNaN(when.getTime())) {
    return new ServiceError('validation_error', CHAT_MESSAGES.SCHEDULE_INVALID_TIME, 422, {
      scheduled_at: ['Provide a valid ISO 8601 timestamp'],
    });
  }
  if (when.getTime() <= Date.now()) {
    return new ServiceError('validation_error', CHAT_MESSAGES.SCHEDULE_IN_PAST, 422, {
      scheduled_at: ['Pick a time in the future'],
    });
  }
  const cancelled = await actOnSchedule(messageId, userId, 'cancel');
  if (!cancelled.success) return cancelled;
  return proposeSchedule(existing.conversation_id, userId, scheduledAtIso, note);
};

export const markConversationRead = async (conversationId: string, userId: string) => {
  return withTransaction(async (client) => {
    const conv = await repo.findConversationByIdForUpdate(client, conversationId);
    if (!conv) return new ServiceError('not_found', CHAT_MESSAGES.NOT_FOUND, 404);
    const notMine = assertParticipant(conv, userId);
    if (notMine) return notMine;
    await repo.markRead(client, conv, userId);
    return new ServiceSuccess({ ok: true }, CHAT_MESSAGES.MARKED_READ);
  });
};

export const getUnreadCount = async (userId: string) => {
  const total = await repo.totalUnreadForUser(userId);
  return new ServiceSuccess({ unread_count: total }, CHAT_MESSAGES.UNREAD_FETCHED);
};
