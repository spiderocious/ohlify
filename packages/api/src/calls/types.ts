export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled_outside_window'
  | 'cancelled_inside_window'
  | 'fulfilled';

export type CallStatus =
  | 'scheduled'
  | 'waiting_for_parties'
  | 'in_progress'
  | 'completed'
  | 'no_show_caller'
  | 'no_show_callee'
  | 'no_show_both'
  | 'disconnected_caller'
  | 'disconnected_callee';

export type FeeMode = 'deduct_from_payee' | 'add_to_payer';

export interface Booking {
  id: string;
  status: BookingStatus;
  caller_user_id: string;
  callee_user_id: string;
  rate_id: string;
  call_type: 'audio' | 'video';
  start_at: string;
  duration_minutes: number;
  total_paid_kobo: number;
  payee_amount_kobo: number;
  platform_fee_kobo: number;
  fee_mode_used: string;
  call_id: string;
  cancelled_at: string | null;
  cancelled_by_user_id: string | null;
  created_at: string;
}

export interface BookingsPage {
  data: Booking[];
  meta: { next_cursor: string | null; has_more: boolean };
}

export interface CallRecord {
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

export interface CallsPage {
  data: CallRecord[];
  meta: { next_cursor: string | null; has_more: boolean };
}

export interface CallHistoryItem {
  call_id: string;
  booking_id: string;
  caller_user_id: string;
  callee_user_id: string;
  rate_id: string;
  call_type: 'audio' | 'video';
  start_at: string;
  duration_minutes: number;
  total_paid_kobo: number;
  payee_amount_kobo: number;
  platform_fee_kobo: number;
  fee_mode_used: FeeMode;
  booking_status: BookingStatus;
  cancelled_at: string | null;
  cancelled_by_user_id: string | null;
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
  created_at: string;
}

export interface CallHistoryPage {
  data: CallHistoryItem[];
  meta: { next_cursor: string | null; has_more: boolean };
}

export interface JoinCallResponse {
  call_id: string;
  agora_app_id: string;
  agora_channel_name: string;
  agora_uid: number;
  agora_token: string;
  expires_at: string;
  call_type: 'audio' | 'video';
  duration_minutes: number;
  remote_user_id: string;
  total_paid_kobo: number;
}
