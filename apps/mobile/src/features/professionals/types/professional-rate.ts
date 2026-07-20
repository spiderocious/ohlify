import type { CallType } from '@ohlify/core';

/** Mirrors mobile/lib/shared/types/professional_rate.dart. */
export interface ProfessionalRate {
  callType: CallType;
  durationMinutes: number;
  /** Formatted price string e.g. "₦ 10,800". */
  price: string;
  /** Formatted derived per-minute price e.g. "₦ 166.66 / min". Undefined when the backend hasn't supplied it. */
  pricePerMinute?: string;
}
