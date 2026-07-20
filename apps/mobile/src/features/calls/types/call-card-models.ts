import type { CallType } from '@ohlify/core';

/** Mirrors mobile/lib/shared/types/scheduled_call_item.dart. */
export interface ScheduledCallItem {
  id: string;
  name: string;
  role: string;
  rating: number;
  callType: CallType;
  time: string;
  date: string;
  duration: string;
  /** true → Cancel + Reschedule buttons; false → Join call button. */
  canReschedule: boolean;
  avatarKey?: string;
}

/** Mirrors mobile/lib/shared/types/completed_call_item.dart. */
export interface CompletedCallGroup {
  date: string;
  calls: CompletedCallItem[];
}

export interface CompletedCallItem {
  id: string;
  name: string;
  callType: CallType;
  time: string;
  duration: string;
  amount: string;
  stateLabel: string;
  avatarKey?: string;
}
