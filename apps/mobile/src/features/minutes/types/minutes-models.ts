/**
 * Prepaid call time held against one professional.
 *
 * Billing is per-second, so `secondsRemaining` is the real balance and every
 * display derives from it via `formatSecondsAsDuration`. The backend still
 * sends a floored `minutes_remaining` for older builds; new code should ignore
 * it rather than re-deriving minutes here.
 */
export interface MinuteBalance {
  professionalId: string;
  /** 'audio' | 'video'. */
  callType: string;
  secondsRemaining: number;
  /** Per-minute price snapshotted at the last purchase. Seconds bill pro-rata off it. */
  rateSnapshotKobo: number;
  escrowKobo: number;
}

/** Falls back to `minutes_remaining × 60` so a client ahead of the server still reads a balance. */
function readSeconds(json: Record<string, unknown>, secondsKey: string, minutesKey: string): number {
  if (typeof json[secondsKey] === 'number') return json[secondsKey];
  if (typeof json[minutesKey] === 'number') return json[minutesKey] * 60;
  return 0;
}

export function minuteBalanceFromJson(json: Record<string, unknown>): MinuteBalance {
  return {
    professionalId: json.professional_id as string,
    callType: json.call_type as string,
    secondsRemaining: readSeconds(json, 'seconds_remaining', 'minutes_remaining'),
    rateSnapshotKobo: typeof json.rate_snapshot_kobo === 'number' ? json.rate_snapshot_kobo : 0,
    escrowKobo: typeof json.escrow_kobo === 'number' ? json.escrow_kobo : 0,
  };
}

export interface BuyMinutesResult {
  professionalId: string;
  callType: string;
  secondsPurchased: number;
  perMinuteKobo: number;
  amountChargedKobo: number;
  secondsRemaining: number;
}

export function buyMinutesResultFromJson(json: Record<string, unknown>): BuyMinutesResult {
  return {
    professionalId: json.professional_id as string,
    callType: json.call_type as string,
    secondsPurchased: readSeconds(json, 'seconds_purchased', 'minutes_purchased'),
    perMinuteKobo: typeof json.per_minute_kobo === 'number' ? json.per_minute_kobo : 0,
    amountChargedKobo: typeof json.amount_charged_kobo === 'number' ? json.amount_charged_kobo : 0,
    secondsRemaining: readSeconds(json, 'seconds_remaining', 'minutes_remaining'),
  };
}
