/** Join credentials plus the billable ceiling the client counts down against. */
export interface InstantCallJoin {
  callId: string;
  status: string;
  agoraAppId: string;
  agoraChannelName: string;
  agoraUid: number;
  agoraToken: string;
  expiresAt: string;
  callType: string;
  remoteUserId: string;
  perMinuteKobo: number;
  /** Hard cap on billable talk time. At zero the call pauses for a top-up. */
  secondsAllotted: number;
}

export function instantCallJoinFromJson(json: Record<string, unknown>): InstantCallJoin {
  const secondsAllotted =
    typeof json.seconds_allotted === 'number'
      ? json.seconds_allotted
      : typeof json.max_seconds === 'number'
        ? json.max_seconds
        : 0;
  return {
    callId: json.call_id as string,
    status: json.status as string,
    agoraAppId: json.agora_app_id as string,
    agoraChannelName: json.agora_channel_name as string,
    agoraUid: typeof json.agora_uid === 'number' ? json.agora_uid : 0,
    agoraToken: json.agora_token as string,
    expiresAt: json.expires_at as string,
    callType: json.call_type as string,
    remoteUserId: json.remote_user_id as string,
    perMinuteKobo: typeof json.per_minute_kobo === 'number' ? json.per_minute_kobo : 0,
    secondsAllotted,
  };
}

export interface IncomingInstantCall {
  callId: string;
  callerUserId: string;
  callType: string;
  agoraChannelName: string;
}

export function incomingInstantCallFromJson(json: Record<string, unknown>): IncomingInstantCall {
  return {
    callId: json.call_id as string,
    callerUserId: json.caller_user_id as string,
    callType: json.call_type as string,
    agoraChannelName: json.agora_channel_name as string,
  };
}

export const CallParticipantRole = {
  CALLER: 'caller',
  CALLEE: 'callee',
  INVITEE: 'invitee',
} as const;

export type CallParticipantRole =
  (typeof CallParticipantRole)[keyof typeof CallParticipantRole];

export const CallParticipantStatus = {
  PENDING_APPROVAL: 'pending_approval',
  RINGING: 'ringing',
  JOINED: 'joined',
  LEFT: 'left',
  DECLINED: 'declined',
  EXPIRED: 'expired',
  REJECTED: 'rejected',
} as const;

export type CallParticipantStatus =
  (typeof CallParticipantStatus)[keyof typeof CallParticipantStatus];

export interface CallParticipant {
  userId: string;
  role: CallParticipantRole;
  status: CallParticipantStatus;
  name?: string;
  avatarKey?: string;
  handle?: string;
  invitedBy?: string;
  joinedAt?: string;
}

export function callParticipantFromJson(json: Record<string, unknown>): CallParticipant {
  return {
    userId: json.user_id as string,
    role: (json.role as CallParticipantRole) ?? CallParticipantRole.INVITEE,
    status: (json.status as CallParticipantStatus) ?? CallParticipantStatus.LEFT,
    name: (json.name as string) ?? undefined,
    avatarKey: (json.avatar_url as string) ?? undefined,
    handle: (json.handle as string) ?? undefined,
    invitedBy: (json.invited_by as string) ?? undefined,
    joinedAt: (json.joined_at as string) ?? undefined,
  };
}

export interface CallInviteResult {
  participantId: string;
  userId: string;
  status: CallParticipantStatus;
}

export function callInviteResultFromJson(json: Record<string, unknown>): CallInviteResult {
  return {
    participantId: json.participant_id as string,
    userId: json.user_id as string,
    status: (json.status as CallParticipantStatus) ?? CallParticipantStatus.PENDING_APPROVAL,
  };
}
