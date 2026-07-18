import type { CallType } from '@features/bookings/bookings.types.js';
import type { JsonKobo } from '@features/wallet/wallet.types.js';

export interface MinuteBalanceRow {
  id: string;
  user_id: string;
  professional_id: string;
  call_type: CallType;
  minutes_remaining: number;
  rate_snapshot_kobo: string;
  escrow_kobo: string;
  created_at: Date;
  updated_at: Date;
}

export interface MinuteBalanceView {
  professional_id: string;
  call_type: CallType;
  minutes_remaining: number;
  /** Per-minute price snapshotted at the last purchase (kobo). */
  rate_snapshot_kobo: JsonKobo;
  /** Money held in escrow backing these minutes (kobo). */
  escrow_kobo: JsonKobo;
}

export interface MinutePurchaseRow {
  id: string;
  user_id: string;
  professional_id: string;
  call_type: CallType;
  amount_kobo: string;
  per_minute_kobo: string;
  minutes_purchased: number;
  journal_id: string | null;
  created_at: Date;
}

export interface MinutePurchaseView {
  id: string;
  professional_id: string;
  call_type: CallType;
  amount_kobo: JsonKobo;
  per_minute_kobo: JsonKobo;
  minutes_purchased: number;
  created_at: string;
}
