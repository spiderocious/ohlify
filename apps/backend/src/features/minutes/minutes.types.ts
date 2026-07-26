import type { CallType } from '@features/bookings/bookings.types.js';
import type { JsonKobo } from '@features/wallet/wallet.types.js';

export interface MinuteBalanceRow {
  id: string;
  user_id: string;
  professional_id: string;
  call_type: CallType;
  seconds_remaining: number;
  /** Price the professional quotes, per minute. Seconds are billed pro-rata off it. */
  rate_snapshot_kobo: string;
  escrow_kobo: string;
  created_at: Date;
  updated_at: Date;
}

export interface MinuteBalanceView {
  professional_id: string;
  call_type: CallType;
  /** Authoritative balance. Billing is per-second; minutes are a display unit. */
  seconds_remaining: number;
  /**
   * Whole minutes still available, floored. Kept so shipped app versions that
   * predate per-second billing keep rendering a sane number — new surfaces
   * should read `seconds_remaining` and format it themselves.
   */
  minutes_remaining: number;
  /** Per-minute price snapshotted at the last purchase (kobo). */
  rate_snapshot_kobo: JsonKobo;
  /** Money held in escrow backing these seconds (kobo). */
  escrow_kobo: JsonKobo;
}

export interface MinutePurchaseRow {
  id: string;
  user_id: string;
  professional_id: string;
  call_type: CallType;
  amount_kobo: string;
  per_minute_kobo: string;
  seconds_purchased: number;
  journal_id: string | null;
  created_at: Date;
}

export interface MinutePurchaseView {
  id: string;
  professional_id: string;
  call_type: CallType;
  amount_kobo: JsonKobo;
  per_minute_kobo: JsonKobo;
  seconds_purchased: number;
  minutes_purchased: number;
  created_at: string;
}
