/** The account roles this feature branches on. Mirrors `users.role`. */
export const InviteUserRole = {
  CLIENT: 'client',
  PROFESSIONAL: 'professional',
} as const;

export type InviteUserRole = (typeof InviteUserRole)[keyof typeof InviteUserRole];

export const CallParticipantRole = {
  CALLER: 'caller',
  CALLEE: 'callee',
  INVITEE: 'invitee',
} as const;

export type CallParticipantRole = (typeof CallParticipantRole)[keyof typeof CallParticipantRole];

export const CallParticipantStatus = {
  /** Invited; waiting on the professional to allow them into the room. */
  PENDING_APPROVAL: 'pending_approval',
  /** Professional allowed them; the invitee's devices are ringing. */
  RINGING: 'ringing',
  JOINED: 'joined',
  LEFT: 'left',
  /** The invitee declined the ring. */
  DECLINED: 'declined',
  /** Nobody answered in time — either wait can expire. */
  EXPIRED: 'expired',
  /** The professional refused the invite. */
  REJECTED: 'rejected',
} as const;

export type CallParticipantStatus =
  (typeof CallParticipantStatus)[keyof typeof CallParticipantStatus];

/** Statuses that occupy a seat — they count toward the participant cap. */
export const OCCUPYING_PARTICIPANT_STATUSES: CallParticipantStatus[] = [
  CallParticipantStatus.PENDING_APPROVAL,
  CallParticipantStatus.RINGING,
  CallParticipantStatus.JOINED,
];

/** Maximum people in one room, including the original caller and callee. 🔒 */
export const MAX_CALL_PARTICIPANTS = 3;

export interface CallParticipantRow {
  id: string;
  call_id: string;
  user_id: string;
  role: CallParticipantRole;
  status: CallParticipantStatus;
  invited_by: string | null;
  agora_uid: number | null;
  joined_at: Date | null;
  left_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CallParticipantView {
  user_id: string;
  role: CallParticipantRole;
  status: CallParticipantStatus;
  name: string | null;
  avatar_url: string | null;
  handle: string | null;
  invited_by: string | null;
  joined_at: string | null;
}
