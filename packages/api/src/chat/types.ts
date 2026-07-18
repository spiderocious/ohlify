export type MessageKind = 'text' | 'schedule';

export type ScheduleStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export type ScheduleAction = 'accept' | 'decline' | 'cancel';

export interface Conversation {
  id: string;
  peer_user_id: string;
  peer_name: string | null;
  peer_avatar_url: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  mine: boolean;
  body: string;
  kind: MessageKind;
  /** Schedule messages only. ISO 8601. */
  scheduled_at: string | null;
  schedule_status: ScheduleStatus | null;
  /** What the viewer may do with this schedule card right now. */
  can_accept: boolean;
  can_decline: boolean;
  can_reschedule: boolean;
  can_cancel: boolean;
  created_at: string;
}

/**
 * Thread context — peer, the client's remaining minutes with the pro (drives the
 * "credits running low / out" banner above the composer), the low threshold, and
 * any live schedule.
 */
export interface ConversationContext {
  id: string;
  peer_user_id: string;
  peer_name: string | null;
  peer_avatar_url: string | null;
  viewer_is_client: boolean;
  minutes_remaining: number;
  low_minutes_threshold: number;
  /** False when the client is out of minutes (the pro can always reply). */
  can_send: boolean;
  active_schedule: ChatMessage | null;
}

export interface ConversationsPage {
  data: Conversation[];
  meta: { next_cursor: string | null; has_more: boolean };
}

export interface MessagesPage {
  data: ChatMessage[];
  meta: { next_cursor: string | null; has_more: boolean };
}

export interface OpenConversationResult {
  id: string;
  professional_id: string;
}

export interface ProposeSchedulePayload {
  /** ISO 8601. */
  scheduled_at: string;
  note?: string;
}
