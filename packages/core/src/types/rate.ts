import type { CallType } from './call.js';

export interface ProfessionalRate {
  callType: CallType;
  durationMinutes: number;
  /** Pre-formatted display price, e.g. "₦ 10,800". */
  price: string;
}

export interface CallRate {
  id: string;
  callType: CallType;
  durationMinutes: number;
  /** Pre-formatted display price, e.g. "₦ 10,800". */
  price: string;
}
