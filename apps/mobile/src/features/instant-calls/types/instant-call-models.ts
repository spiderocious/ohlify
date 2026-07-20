/** Mirrors mobile/lib/features/instant_calls/types/instant_call_models.dart. */
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
  minutesAllotted: number;
  maxSeconds: number;
}

export function instantCallJoinFromJson(json: Record<string, unknown>): InstantCallJoin {
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
    minutesAllotted: typeof json.minutes_allotted === 'number' ? json.minutes_allotted : 0,
    maxSeconds: typeof json.max_seconds === 'number' ? json.max_seconds : 0,
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
