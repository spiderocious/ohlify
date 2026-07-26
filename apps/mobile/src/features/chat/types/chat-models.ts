/** Mirrors mobile/lib/features/chat/types/chat_models.dart. */
export interface Conversation {
  id: string;
  peerUserId: string;
  peerName?: string;
  peerAvatarUrl?: string;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  unreadCount: number;
}

export function conversationFromJson(json: Record<string, unknown>): Conversation {
  return {
    id: json.id as string,
    peerUserId: json.peer_user_id as string,
    peerName: json.peer_name as string | undefined,
    peerAvatarUrl: json.peer_avatar_url as string | undefined,
    lastMessageAt: json.last_message_at as string | undefined,
    lastMessagePreview: json.last_message_preview as string | undefined,
    unreadCount: typeof json.unread_count === 'number' ? json.unread_count : 0,
  };
}

/** A call recorded in the thread. Present only on `kind === 'call_event'`. */
export interface CallEvent {
  callId: string;
  callType: string;
  /** 'completed' | 'missed' | 'declined' | 'cancelled'. */
  outcome: string;
  /** Talk time on a completed call. */
  seconds?: number;
  callerUserId: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderUserId: string;
  mine: boolean;
  body: string;
  createdAt: string;
  /** 'text' | 'schedule' | 'call_event'. */
  kind: string;
  callEvent?: CallEvent;
  scheduledAt?: string;
  /** 'pending' | 'accepted' | 'declined' | 'cancelled'. */
  scheduleStatus?: string;
  canAccept: boolean;
  canDecline: boolean;
  canReschedule: boolean;
  canCancel: boolean;
}

export function chatMessageIsSchedule(m: ChatMessage): boolean {
  return m.kind === 'schedule';
}

/** Local delivery state layered on top of a ChatMessage for optimistic send — never sent to or read from the server. */
export type MessageDeliveryStatus = 'sent' | 'sending' | 'failed';

export interface OptimisticChatMessage extends ChatMessage {
  deliveryStatus: MessageDeliveryStatus;
}

export function withDeliveryStatus(message: ChatMessage, deliveryStatus: MessageDeliveryStatus = 'sent'): OptimisticChatMessage {
  return { ...message, deliveryStatus };
}

function callEventFromJson(raw: unknown): CallEvent | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const e = raw as Record<string, unknown>;
  return {
    callId: (e.call_id as string) ?? '',
    callType: (e.call_type as string) ?? 'audio',
    outcome: (e.outcome as string) ?? 'completed',
    ...(typeof e.seconds === 'number' ? { seconds: e.seconds } : {}),
    callerUserId: (e.caller_user_id as string) ?? '',
  };
}

export function chatMessageFromJson(json: Record<string, unknown>): ChatMessage {
  return {
    id: json.id as string,
    conversationId: json.conversation_id as string,
    senderUserId: json.sender_user_id as string,
    mine: (json.mine as boolean) ?? false,
    body: json.body as string,
    createdAt: json.created_at as string,
    kind: (json.kind as string) ?? 'text',
    callEvent: callEventFromJson(json.call_event),
    scheduledAt: json.scheduled_at as string | undefined,
    scheduleStatus: json.schedule_status as string | undefined,
    canAccept: (json.can_accept as boolean) ?? false,
    canDecline: (json.can_decline as boolean) ?? false,
    canReschedule: (json.can_reschedule as boolean) ?? false,
    canCancel: (json.can_cancel as boolean) ?? false,
  };
}

/** Thread context — peer, the client's remaining prepaid time, low threshold, live schedule. */
export interface ConversationContext {
  id: string;
  peerUserId: string;
  peerName?: string;
  viewerIsClient: boolean;
  secondsRemaining: number;
  /** Below this many seconds the composer warns; at zero the client cannot send. */
  lowSecondsThreshold: number;
  /** False when the client is out of time (the pro can always reply). */
  canSend: boolean;
  activeSchedule?: ChatMessage;
}

export function conversationContextFromJson(json: Record<string, unknown>): ConversationContext {
  const secondsRemaining =
    typeof json.seconds_remaining === 'number'
      ? json.seconds_remaining
      : typeof json.minutes_remaining === 'number'
        ? json.minutes_remaining * 60
        : 0;
  const lowSecondsThreshold =
    typeof json.low_seconds_threshold === 'number'
      ? json.low_seconds_threshold
      : typeof json.low_minutes_threshold === 'number'
        ? json.low_minutes_threshold * 60
        : 300;
  return {
    id: json.id as string,
    peerUserId: json.peer_user_id as string,
    peerName: json.peer_name as string | undefined,
    viewerIsClient: (json.viewer_is_client as boolean) ?? true,
    secondsRemaining,
    lowSecondsThreshold,
    canSend: (json.can_send as boolean) ?? true,
    activeSchedule: json.active_schedule ? chatMessageFromJson(json.active_schedule as Record<string, unknown>) : undefined,
  };
}
