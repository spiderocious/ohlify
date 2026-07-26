export interface MinuteBalance {
  professional_id: string;
  call_type: 'audio' | 'video';
  /** Authoritative balance — billing is per-second. */
  seconds_remaining: number;
  /** Floored whole minutes, for builds that predate per-second billing. */
  minutes_remaining: number;
  /** Per-minute price snapshotted at the last purchase (kobo). */
  rate_snapshot_kobo: number;
  /** Money held in escrow backing these seconds (kobo). */
  escrow_kobo: number;
}

export interface BuyMinutesPayload {
  professional_id: string;
  call_type: 'audio' | 'video';
  /** Amount in kobo to spend on minutes for this pro. */
  amount_kobo: number;
}

export interface BuyMinutesResult {
  purchase_id: string;
  professional_id: string;
  call_type: 'audio' | 'video';
  seconds_purchased: number;
  /** Floored whole minutes, for builds that predate per-second billing. */
  minutes_purchased: number;
  per_minute_kobo: number;
  /** Amount debited. The whole spend buys time — nothing is held back as a remainder. */
  amount_charged_kobo: number;
  seconds_remaining: number;
  minutes_remaining: number;
}
