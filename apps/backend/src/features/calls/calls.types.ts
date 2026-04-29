import type { JsonKobo } from '@features/wallet/wallet.types.js';

export const CallStatus = {
  SCHEDULED: 'scheduled',
  WAITING_FOR_PARTIES: 'waiting_for_parties',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  NO_SHOW_CALLER: 'no_show_caller',
  NO_SHOW_CALLEE: 'no_show_callee',
  NO_SHOW_BOTH: 'no_show_both',
  DISCONNECTED_CALLER: 'disconnected_caller',
  DISCONNECTED_CALLEE: 'disconnected_callee',
} as const;

export type CallStatus = (typeof CallStatus)[keyof typeof CallStatus];

export const TERMINAL_CALL_STATUSES: readonly CallStatus[] = [
  CallStatus.COMPLETED,
  CallStatus.NO_SHOW_CALLER,
  CallStatus.NO_SHOW_CALLEE,
  CallStatus.NO_SHOW_BOTH,
  CallStatus.DISCONNECTED_CALLER,
  CallStatus.DISCONNECTED_CALLEE,
];

export interface CallRow {
  id: string;
  booking_id: string;
  status: CallStatus;
  agora_channel_name: string;
  caller_joined_at: Date | null;
  callee_joined_at: Date | null;
  caller_left_at: Date | null;
  callee_left_at: Date | null;
  connected_seconds: number;
  settlement_journal_id: string | null;
  refund_journal_id: string | null;
  ended_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CallView {
  id: string;
  booking_id: string;
  status: CallStatus;
  agora_channel_name: string;
  connected_seconds: number;
  caller_joined_at: string | null;
  callee_joined_at: string | null;
  caller_left_at: string | null;
  callee_left_at: string | null;
  ended_at: string | null;
  settlement_journal_id: string | null;
  refund_journal_id: string | null;
  created_at: string;
}

export interface CallJoinView {
  call_id: string;
  agora_app_id: string;
  agora_channel_name: string;
  agora_uid: number;
  agora_token: string;
  expires_at: string;
  call_type: 'audio' | 'video';
  duration_minutes: number;
  remote_user_id: string;
  total_paid_kobo: JsonKobo;
}

export interface CallEventRow {
  id: string;
  call_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  occurred_at: Date;
}
