import * as authRepo from '@features/auth/auth.repo.js';
import * as minutesRepo from '@features/minutes/minutes.repo.js';
import { platformConfig } from '@lib/config/platform-config.service.js';
import { withTransaction, withTransactionUnless } from '@lib/db/tx.js';
import { encodeCursor, resolveLimit } from '@lib/pagination.js';
import { insertEvent, OutboxAggregateType, OutboxEventType } from '@lib/outbox/index.js';
import { ServiceError, ServiceSuccess } from '@lib/service-result.js';

import { CHAT_MESSAGES } from './chat.messages.js';
import * as repo from './chat.repo.js';
import {
  CallEventOutcome,
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
    call_event: row.call_event,
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
    (b) => b.professional_id === professionalId && b.seconds_remaining > 0,
  );
  if (!hasMinutes) {
    return new ServiceError('forbidden', CHAT_MESSAGES.NEEDS_MINUTES, 403);
  }
  return null;
};

// Queues the push notification for a freshly-inserted message, inside the
// same tx — so a rolled-back send never notifies. The outbox worker fans out
// to the recipient's devices; the client deep-links via conversation_id.
const queueMessagePush = async (
  client: Parameters<Parameters<typeof withTransaction>[0]>[0],
  conv: ConversationRow,
  senderUserId: string,
  messageId: string,
  preview: string,
): Promise<void> => {
  const targetUserId =
    conv.client_user_id === senderUserId ? conv.professional_id : conv.client_user_id;
  const sender = await authRepo.findUserById(senderUserId);
  await insertEvent(client, {
    aggregateType: OutboxAggregateType.CHAT,
    aggregateId: conv.id,
    eventType: OutboxEventType.PUSH_CHAT_MESSAGE,
    payload: {
      conversation_id: conv.id,
      message_id: messageId,
      target_user_id: targetUserId,
      sender_user_id: senderUserId,
      sender_full_name: sender?.full_name ?? null,
      sender_avatar_url: sender?.avatar_url ?? null,
      preview: preview.length > 140 ? `${preview.slice(0, 139)}…` : preview,
    },
  });
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

  // Prepaid time is always held by the CLIENT against the PRO, regardless of viewer.
  const balances = await minutesRepo.listBalancesForUser(conv.client_user_id);
  const secondsRemaining = balances
    .filter((b) => b.professional_id === conv.professional_id)
    .reduce((sum, b) => sum + b.seconds_remaining, 0);

  const peer = await authRepo.findUserById(peerUserId);
  const activeSchedule = await repo.findActiveSchedule(conversationId);
  const lowMinutesThreshold = platformConfig.chat().low_minutes_threshold;

  return new ServiceSuccess(
    {
      id: conv.id,
      peer_user_id: peerUserId,
      peer_name: peer?.full_name ?? null,
      peer_avatar_url: peer?.avatar_url ?? null,
      /** The viewer is the paying side (and so is subject to the minutes gate). */
      viewer_is_client: viewerIsClient,
      seconds_remaining: secondsRemaining,
      minutes_remaining: Math.floor(secondsRemaining / 60),
      low_minutes_threshold: lowMinutesThreshold,
      low_seconds_threshold: lowMinutesThreshold * 60,
      /** Client can only send while they hold time; the pro can always reply. */
      can_send: viewerIsClient ? secondsRemaining > 0 : true,
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
    await queueMessagePush(client, conv, senderUserId, msg.id, body);
    return new ServiceSuccess(toMessageView(msg, senderUserId), CHAT_MESSAGES.MESSAGE_SENT);
  });
};

// ── Schedule-from-chat ──────────────────────────────────────────────────────
// A scheduled call is a chat-native marker (message kind='schedule'), NOT the
// old bookings flow. Either party can propose. Purely informational until
// notifications land — the card's Join button starts a normal instant call.

type TxClient = Parameters<Parameters<typeof withTransaction>[0]>[0];

/** The narrow surface a transactional write needs — lets callers pass any runner. */
interface QueryRunner {
  query: TxClient['query'];
}

// Rejects a proposed time before any state changes — a reschedule cancels the
// old card first, so an invalid new time has to be caught before that happens.
const validateScheduleTime = (scheduledAtIso: string): ServiceError | Date => {
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
  return when;
};

const insertProposal = async (
  client: TxClient,
  conversationId: string,
  senderUserId: string,
  when: Date,
  note: string | undefined,
) => {
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
  await queueMessagePush(client, conv, senderUserId, msg.id, `📅 ${body}`);
  return new ServiceSuccess(toMessageView(msg, senderUserId), CHAT_MESSAGES.SCHEDULE_PROPOSED);
};

/** Propose a call time. Either party may schedule; the client still needs minutes. */
export const proposeSchedule = async (
  conversationId: string,
  senderUserId: string,
  scheduledAtIso: string,
  note: string | undefined,
) => {
  const when = validateScheduleTime(scheduledAtIso);
  if (when instanceof ServiceError) return when;
  return withTransaction((client) =>
    insertProposal(client, conversationId, senderUserId, when, note),
  );
};

type ScheduleAction = 'accept' | 'decline' | 'cancel';

const statusFor = (action: ScheduleAction): ScheduleStatus => {
  if (action === 'accept') return ScheduleStatus.ACCEPTED;
  if (action === 'decline') return ScheduleStatus.DECLINED;
  return ScheduleStatus.CANCELLED;
};

const applyScheduleAction = async (
  client: TxClient,
  messageId: string,
  userId: string,
  action: ScheduleAction,
) => {
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
  if (!permittedScheduleAction(action, isProposer, status)) {
    return new ServiceError('forbidden', CHAT_MESSAGES.SCHEDULE_NOT_ACTIONABLE, 403);
  }

  const updated = await repo.updateScheduleStatus(client, messageId, statusFor(action));
  return new ServiceSuccess(toMessageView(updated, userId), CHAT_MESSAGES.SCHEDULE_UPDATED);
};

// Accept/decline (invitee only) or cancel (proposer only) a live schedule.
export const actOnSchedule = async (messageId: string, userId: string, action: ScheduleAction) =>
  withTransaction((client) => applyScheduleAction(client, messageId, userId, action));

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
 *
 * Both halves share one transaction. Running them separately meant a failure
 * in the second — a lapsed minutes gate, a dropped connection — left the
 * original card cancelled with nothing in its place, destroying a schedule the
 * user only meant to move. (BUGS.md D1.)
 */
export const reschedule = async (
  messageId: string,
  userId: string,
  scheduledAtIso: string,
  note: string | undefined,
) => {
  const when = validateScheduleTime(scheduledAtIso);
  if (when instanceof ServiceError) return when;

  const existing = await repo.findConversationOfMessage(messageId);
  if (!existing) {
    return new ServiceError('not_found', CHAT_MESSAGES.SCHEDULE_NOT_FOUND, 404);
  }

  return withTransactionUnless(
    async (client) => {
      const cancelled = await applyScheduleAction(client, messageId, userId, 'cancel');
      if (!cancelled.success) return cancelled;
      return insertProposal(client, existing.conversation_id, userId, when, note);
    },
    (result) => result.success,
  );
};

const CALL_EVENT_BODIES: Record<CallEventOutcome, string> = {
  [CallEventOutcome.COMPLETED]: 'Call',
  [CallEventOutcome.MISSED]: 'Missed call',
  [CallEventOutcome.DECLINED]: 'Call declined',
  [CallEventOutcome.CANCELLED]: 'Call cancelled',
};

/**
 * Records a finished call in the two parties' thread.
 *
 * Written in the caller's transaction so a settlement that rolls back cannot
 * leave a call in the thread that never happened.
 *
 * Deliberately does NOT bump unread or push: the Calls tab already badges this,
 * and a second notification for one call is noise. The thread entry is a
 * record, not an alert.
 */
export const recordCallEvent = async (
  client: QueryRunner,
  input: {
    clientUserId: string;
    professionalId: string;
    callerUserId: string;
    callId: string;
    callType: string;
    outcome: CallEventOutcome;
    seconds?: number;
  },
): Promise<void> => {
  const conv = await repo.ensureConversation(client, input.clientUserId, input.professionalId);
  await repo.insertCallEventMessage(client, {
    conversationId: conv.id,
    callerUserId: input.callerUserId,
    body: CALL_EVENT_BODIES[input.outcome],
    callEvent: {
      call_id: input.callId,
      call_type: input.callType,
      outcome: input.outcome,
      caller_user_id: input.callerUserId,
      ...(input.seconds !== undefined ? { seconds: input.seconds } : {}),
    },
  });
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
