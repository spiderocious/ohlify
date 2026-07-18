import type { CallType } from '@features/bookings/bookings.types.js';
import type { JsonKobo } from '@features/wallet/wallet.types.js';

export const InstantCallStatus = {
  RINGING: 'ringing',
  ACTIVE: 'active',
  ENDED: 'ended',
  MISSED: 'missed',
  CANCELLED: 'cancelled',
} as const;

export type InstantCallStatus = (typeof InstantCallStatus)[keyof typeof InstantCallStatus];

export const LIVE_INSTANT_CALL_STATUSES: readonly InstantCallStatus[] = [
  InstantCallStatus.RINGING,
  InstantCallStatus.ACTIVE,
];

export interface InstantCallRow {
  id: string;
  caller_user_id: string;
  callee_user_id: string;
  call_type: CallType;
  status: InstantCallStatus;
  agora_channel_name: string;
  per_minute_kobo: string;
  minutes_allotted: number;
  connected_seconds: number;
  settled_kobo: string;
  settlement_journal_id: string | null;
  caller_joined_at: Date | null;
  callee_joined_at: Date | null;
  connected_at: Date | null;
  ended_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

// Returned to the caller when a call is started, and to the callee on answer:
// full Agora join credentials + the minutes cap.
export interface InstantCallJoinView {
  call_id: string;
  status: InstantCallStatus;
  agora_app_id: string;
  agora_channel_name: string;
  agora_uid: number;
  agora_token: string;
  expires_at: string;
  call_type: CallType;
  remote_user_id: string;
  per_minute_kobo: JsonKobo;
  minutes_allotted: number;
  // Seconds cap for this call = minutes_allotted * 60. The client counts down.
  max_seconds: number;
}

export interface InstantCallView {
  call_id: string;
  caller_user_id: string;
  callee_user_id: string;
  call_type: CallType;
  status: InstantCallStatus;
  per_minute_kobo: JsonKobo;
  minutes_allotted: number;
  connected_seconds: number;
  settled_kobo: JsonKobo;
  connected_at: string | null;
  ended_at: string | null;
  created_at: string;
}
