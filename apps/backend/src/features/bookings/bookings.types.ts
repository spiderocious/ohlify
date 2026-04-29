import type { JsonKobo } from '@features/wallet/wallet.types.js';

export const BookingStatus = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED_OUTSIDE_WINDOW: 'cancelled_outside_window',
  CANCELLED_INSIDE_WINDOW: 'cancelled_inside_window',
  FULFILLED: 'fulfilled',
} as const;

export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

export const FeeMode = {
  DEDUCT_FROM_PAYEE: 'deduct_from_payee',
  ADD_TO_PAYER: 'add_to_payer',
} as const;

export type FeeMode = (typeof FeeMode)[keyof typeof FeeMode];

export type CallType = 'audio' | 'video';

export interface BookingRow {
  id: string;
  caller_user_id: string;
  callee_user_id: string;
  rate_id: string;
  call_type: CallType;
  start_at: Date;
  duration_minutes: number;
  status: BookingStatus;
  total_paid_kobo: string;
  payee_amount_kobo: string;
  platform_fee_kobo: string;
  fee_mode_used: FeeMode;
  reservation_journal_id: string | null;
  idempotency_key: string | null;
  cancelled_at: Date | null;
  cancelled_by_user_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface BookingView {
  id: string;
  status: BookingStatus;
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
  call_id: string | null;
  cancelled_at: string | null;
  cancelled_by_user_id: string | null;
  created_at: string;
}
