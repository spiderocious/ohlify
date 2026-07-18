export interface MinuteBalance {
  professional_id: string;
  call_type: 'audio' | 'video';
  minutes_remaining: number;
  /** Per-minute price snapshotted at the last purchase (kobo). */
  rate_snapshot_kobo: number;
  /** Money held in escrow backing these minutes (kobo). */
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
  minutes_purchased: number;
  per_minute_kobo: number;
  /** Amount actually debited (whole-minute portion; sub-minute stays in wallet). */
  amount_charged_kobo: number;
  minutes_remaining: number;
}
