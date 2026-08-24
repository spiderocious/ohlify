export const ConversationParticipantRole = {
  /** The client who started the thread. The only person who may invite. */
  OWNER: 'owner',
  /** The professional being consulted. Approves or rejects guests. */
  PROFESSIONAL: 'professional',
  /** An invited third party. Free — the guest is never billed. */
  GUEST: 'guest',
} as const;

export type ConversationParticipantRole =
  (typeof ConversationParticipantRole)[keyof typeof ConversationParticipantRole];

export const ConversationParticipantStatus = {
  PENDING_APPROVAL: 'pending_approval',
  ACTIVE: 'active',
  REJECTED: 'rejected',
  REMOVED: 'removed',
} as const;

export type ConversationParticipantStatus =
  (typeof ConversationParticipantStatus)[keyof typeof ConversationParticipantStatus];

/**
 * Statuses that occupy a seat.
 *
 * `pending_approval` counts: a pending guest is holding a place, and letting a
 * fourth be invited while a third awaits approval would blow the cap the
 * moment the professional says yes.
 */
export const OCCUPYING_PARTICIPANT_STATUSES: ConversationParticipantStatus[] = [
  ConversationParticipantStatus.PENDING_APPROVAL,
  ConversationParticipantStatus.ACTIVE,
];

/** Statuses that can read and post. */
export const ACTIVE_PARTICIPANT_STATUSES: ConversationParticipantStatus[] = [
  ConversationParticipantStatus.ACTIVE,
];

/**
 * Maximum people in one thread, counting the client and the professional. 🔒
 * Matches `MAX_CALL_PARTICIPANTS` — a thread and a call hold the same crowd.
 */
export const MAX_CONVERSATION_PARTICIPANTS = 3;

export interface ConversationParticipantRow {
  id: string;
  conversation_id: string;
  user_id: string;
  role: ConversationParticipantRole;
  status: ConversationParticipantStatus;
  unread_count: number;
  invited_by: string | null;
  joined_at: Date;
  left_at: Date | null;
  created_at: Date;
}

/** Participant plus the display fields every roster render needs. */
export interface ConversationParticipantView {
  participant_id: string;
  user_id: string;
  role: ConversationParticipantRole;
  status: ConversationParticipantStatus;
  full_name: string | null;
  avatar_url: string | null;
  invited_by: string | null;
}
