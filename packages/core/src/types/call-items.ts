import type { CallStatus, CallType } from './call.js';

export interface ScheduledCallItem {
  id: string;
  name: string;
  role: string;
  rating: number;
  callType: CallType;
  time: string;
  date: string;
  duration: string;
  /** True → Cancel + Reschedule actions. False → Join. */
  canReschedule: boolean;
  avatarUrl?: string;
}

export interface CompletedCallItem {
  id: string;
  name: string;
  callType: CallType;
  time: string;
  duration: string;
  /** Pre-formatted display amount, e.g. "₦20,000.00". */
  amount: string;
  avatarUrl?: string;
}

export interface CompletedCallGroup {
  /** Display group label, e.g. "FEBRUARY 2, 2023". */
  date: string;
  calls: CompletedCallItem[];
}

export interface CallDetail {
  id: string;
  professionalId: string;
  name: string;
  role: string;
  rating: number;
  callType: CallType;
  status: CallStatus;
  time: string;
  date: string;
  duration: string;
  canJoin: boolean;
  canReschedule: boolean;
  amount?: string;
  avatarUrl?: string;
}
