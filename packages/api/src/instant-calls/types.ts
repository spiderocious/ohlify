export type InstantCallStatus = 'ringing' | 'active' | 'ended' | 'missed' | 'cancelled';

export interface StartInstantCallPayload {
  professional_id: string;
  call_type: 'audio' | 'video';
}

export interface InstantCallJoin {
  call_id: string;
  status: InstantCallStatus;
  agora_app_id: string;
  agora_channel_name: string;
  agora_uid: number;
  agora_token: string;
  expires_at: string;
  call_type: 'audio' | 'video';
  remote_user_id: string;
  per_minute_kobo: number;
  /** Hard cap on billable talk time. The client counts down against it. */
  seconds_allotted: number;
  /** Retained alias of `seconds_allotted` for builds that predate it. */
  max_seconds: number;
  /**
   * Floored whole minutes. Superseded by `seconds_allotted` — billing is
   * per-second, so this under-reports any part-minute and should not gate a
   * countdown. Kept only so existing consumers keep compiling.
   */
  minutes_allotted: number;
}

export interface IncomingInstantCall {
  call_id: string;
  caller_user_id: string;
  call_type: 'audio' | 'video';
  agora_channel_name: string;
}
