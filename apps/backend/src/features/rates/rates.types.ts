export type CallType = 'audio' | 'video';

export interface RateRow {
  id: string;
  user_id: string;
  call_type: CallType;
  duration_minutes: number;
  price_kobo: string;
  currency: string;
  created_at: Date;
  deleted_at: Date | null;
}

export interface RateView {
  id: string;
  call_type: CallType;
  duration_minutes: number;
  price_kobo: number;
  /**
   * Derived, never stored: floor(price_kobo / duration_minutes). Floor
   * guarantees per_minute_kobo * duration_minutes <= price_kobo, so a
   * full-length call never bills above the quoted price; the sub-duration kobo
   * remainder is absorbed by the platform. See docs/revamp/01-per-minute-rates.md.
   */
  price_per_minute_kobo: number;
  currency: string;
}

/**
 * Per-minute price for a rate, floored. Floor is the system-wide rounding
 * direction (carried into minute-purchase math in Phase 2): charges/payouts
 * always round in the conservative, platform-absorbs direction.
 */
export const perMinuteKobo = (priceKobo: number, durationMinutes: number): number => {
  if (durationMinutes <= 0) {
    throw new Error(`perMinuteKobo: durationMinutes must be positive, got ${durationMinutes}`);
  }
  return Math.floor(priceKobo / durationMinutes);
};
