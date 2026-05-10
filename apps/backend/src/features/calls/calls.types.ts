import type { BookingStatus, CallType, FeeMode } from '@features/bookings/bookings.types.js';
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

// Unified call-history row: a join of bookings + calls. Bookings is the
// driving table (one booking always exists; the call row is created
// atomically with it, so call fields are non-null at the row level even
// though execution-time fields like joined_at/ended_at remain null until
// the live session runs).
export interface CallHistoryRow {
  // call
  call_id: string;
  call_status: CallStatus;
  agora_channel_name: string;
  caller_joined_at: Date | null;
  callee_joined_at: Date | null;
  caller_left_at: Date | null;
  callee_left_at: Date | null;
  connected_seconds: number;
  settlement_journal_id: string | null;
  refund_journal_id: string | null;
  ended_at: Date | null;
  call_created_at: Date;
  // booking
  booking_id: string;
  booking_status: BookingStatus;
  caller_user_id: string;
  callee_user_id: string;
  rate_id: string;
  call_type: CallType;
  start_at: Date;
  duration_minutes: number;
  total_paid_kobo: string;
  payee_amount_kobo: string;
  platform_fee_kobo: string;
  fee_mode_used: FeeMode;
  cancelled_at: Date | null;
  cancelled_by_user_id: string | null;
  booking_created_at: Date;
}

export interface CallHistoryView {
  // identity
  call_id: string;
  booking_id: string;
  // commercial (booking)
  caller_user_id: string;
  callee_user_id: string;
  rate_id: string;
  call_type: CallType;
  start_at: string;
  duration_minutes: number;
  total_paid_kobo: JsonKobo;
  payee_amount_kobo: JsonKobo;
  platform_fee_kobo: JsonKobo;
  fee_mode_used: FeeMode;
  // booking lifecycle
  booking_status: BookingStatus;
  cancelled_at: string | null;
  cancelled_by_user_id: string | null;
  // call lifecycle
  call_status: CallStatus;
  agora_channel_name: string;
  caller_joined_at: string | null;
  callee_joined_at: string | null;
  caller_left_at: string | null;
  callee_left_at: string | null;
  connected_seconds: number;
  settlement_journal_id: string | null;
  refund_journal_id: string | null;
  ended_at: string | null;
  // timestamps
  created_at: string;
}

export interface CallEventRow {
  id: string;
  call_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  occurred_at: Date;
}
