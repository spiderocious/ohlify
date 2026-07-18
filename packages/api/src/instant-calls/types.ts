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
  minutes_allotted: number;
  /** Hard cap for this call in seconds = minutes_allotted * 60. */
  max_seconds: number;
}

export interface IncomingInstantCall {
  call_id: string;
  caller_user_id: string;
  call_type: 'audio' | 'video';
  agora_channel_name: string;
}
