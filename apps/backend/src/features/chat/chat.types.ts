export interface ConversationRow {
  id: string;
  client_user_id: string;
  professional_id: string;
  last_message_at: Date | null;
  last_message_preview: string | null;
  client_unread: number;
  professional_unread: number;
  created_at: Date;
  updated_at: Date;
}

// Conversation joined with the OTHER participant's display fields.
export interface ConversationListRow extends ConversationRow {
  peer_user_id: string;
  peer_name: string | null;
  peer_avatar_url: string | null;
  /** Whether the peer is currently accepting calls. */
  peer_is_available: boolean | null;
  /**
   * The viewer's own unread, read from their participant row.
   *
   * Replaces picking between `client_unread` and `professional_unread`: with a
   * third person in the thread there is no pair to choose from.
   */
  viewer_unread: number;
}

export interface ConversationView {
  id: string;
  peer_user_id: string;
  peer_name: string | null;
  peer_avatar_url: string | null;
  /**
   * Drives the presence dot on the thread row.
   *
   * Additive and nullable: a client that predates it renders no dot, which is
   * exactly what it did before.
   */
  peer_is_available: boolean;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
  created_at: string;
}

export const MessageKind = {
  TEXT: 'text',
  SCHEDULE: 'schedule',
  /** A call between these two, written by the system rather than either party. */
  CALL_EVENT: 'call_event',
} as const;

export type MessageKind = (typeof MessageKind)[keyof typeof MessageKind];

export const ScheduleStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  CANCELLED: 'cancelled',
} as const;

export type ScheduleStatus = (typeof ScheduleStatus)[keyof typeof ScheduleStatus];

/** Terminal states — a schedule here can no longer be acted on. */
export const TERMINAL_SCHEDULE_STATUSES: readonly ScheduleStatus[] = [
  ScheduleStatus.DECLINED,
  ScheduleStatus.CANCELLED,
];

/** What a call event says happened. Set only on `kind = 'call_event'` rows. */
export const CallEventOutcome = {
  COMPLETED: 'completed',
  MISSED: 'missed',
  DECLINED: 'declined',
  CANCELLED: 'cancelled',
} as const;

export type CallEventOutcome = (typeof CallEventOutcome)[keyof typeof CallEventOutcome];

export interface CallEventPayload {
  call_id: string;
  call_type: string;
  outcome: CallEventOutcome;
  /** Talk time, for completed calls. Absent otherwise. */
  seconds?: number;
  /** Who placed the call — the thread renders direction from this. */
  caller_user_id: string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  body: string;
  kind: MessageKind;
  scheduled_at: Date | null;
  schedule_status: ScheduleStatus | null;
  call_event: CallEventPayload | null;
  created_at: Date;
}

export interface MessageView {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  /** True when the current viewer sent it. */
  mine: boolean;
  body: string;
  kind: MessageKind;
  /** Schedule messages only. ISO 8601 UTC. */
  scheduled_at: string | null;
  schedule_status: ScheduleStatus | null;
  /** Present only on call_event messages. */
  call_event: CallEventPayload | null;
  /**
   * Schedule messages only. What the VIEWER may do with this card right now:
   * the invitee (non-sender) can accept/decline a pending one; the sender can
   * reschedule/cancel it. Empty once terminal.
   */
  can_accept: boolean;
  can_decline: boolean;
  can_reschedule: boolean;
  can_cancel: boolean;
  created_at: string;
}
