import type { CallType } from '@ohlify/core';

/** Mirrors mobile/lib/shared/types/call_detail.dart. */
export type CallStatus = 'upcoming' | 'completed' | 'missed';

export interface CallDetail {
  id: string;
  professionalId: string;
  name: string;
  role: string;
  rating: number;
  callType: CallType;
  status: CallStatus;
  /** Display-formatted time, e.g. '12:00 PM'. */
  time: string;
  /** Display-formatted date, e.g. '23 Feb, 2026'. */
  date: string;
  duration: string;
  /** True when the call is scheduled and it's within the join window. */
  canJoin: boolean;
  /** True when a scheduled call can still be rescheduled by the user. */
  canReschedule: boolean;
  /** Only populated for completed calls, e.g. '₦20,000.00'. */
  amount?: string;
  /** File-service KEY (not URL). Resolved by AppAvatar/AppFilePreview. */
  avatarKey?: string;
}
