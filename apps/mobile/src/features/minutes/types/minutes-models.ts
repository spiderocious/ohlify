/** Mirrors mobile/lib/features/minutes/types/minutes_models.dart. */
export interface MinuteBalance {
  professionalId: string;
  /** 'audio' | 'video'. */
  callType: string;
  minutesRemaining: number;
  rateSnapshotKobo: number;
  escrowKobo: number;
}

export function minuteBalanceFromJson(json: Record<string, unknown>): MinuteBalance {
  return {
    professionalId: json.professional_id as string,
    callType: json.call_type as string,
    minutesRemaining: typeof json.minutes_remaining === 'number' ? json.minutes_remaining : 0,
    rateSnapshotKobo: typeof json.rate_snapshot_kobo === 'number' ? json.rate_snapshot_kobo : 0,
    escrowKobo: typeof json.escrow_kobo === 'number' ? json.escrow_kobo : 0,
  };
}

export interface BuyMinutesResult {
  professionalId: string;
  callType: string;
  minutesPurchased: number;
  perMinuteKobo: number;
  amountChargedKobo: number;
  minutesRemaining: number;
}

export function buyMinutesResultFromJson(json: Record<string, unknown>): BuyMinutesResult {
  return {
    professionalId: json.professional_id as string,
    callType: json.call_type as string,
    minutesPurchased: typeof json.minutes_purchased === 'number' ? json.minutes_purchased : 0,
    perMinuteKobo: typeof json.per_minute_kobo === 'number' ? json.per_minute_kobo : 0,
    amountChargedKobo: typeof json.amount_charged_kobo === 'number' ? json.amount_charged_kobo : 0,
    minutesRemaining: typeof json.minutes_remaining === 'number' ? json.minutes_remaining : 0,
  };
}
