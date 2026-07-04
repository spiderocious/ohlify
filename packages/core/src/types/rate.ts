import type { CallType } from './call.js';

export interface ProfessionalRate {
  callType: CallType;
  durationMinutes: number;
  /** Pre-formatted display price, e.g. "₦ 10,800". */
  price: string;
  /** Pre-formatted derived per-minute price, e.g. "₦ 166.66 / min". */
  pricePerMinute?: string;
}

export interface CallRate {
  id: string;
  callType: CallType;
  durationMinutes: number;
  /** Pre-formatted display price, e.g. "₦ 10,800". */
  price: string;
  /** Pre-formatted derived per-minute price, e.g. "₦ 166.66 / min". */
  pricePerMinute?: string;
}
