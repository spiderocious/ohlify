import type { CallType } from '@features/bookings/bookings.types.js';

export const IntentNeed = {
  MINUTES: 'minutes',
  WALLET_BALANCE: 'wallet_balance',
} as const;

export type IntentNeed = (typeof IntentNeed)[keyof typeof IntentNeed];

export const IntentStatus = {
  PENDING: 'pending',
  SATISFIED: 'satisfied',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
} as const;

export type IntentStatus = (typeof IntentStatus)[keyof typeof IntentStatus];

export const TERMINAL_INTENT_STATUSES: readonly IntentStatus[] = [
  IntentStatus.SATISFIED,
  IntentStatus.EXPIRED,
  IntentStatus.CANCELLED,
];

/** How long an unsatisfied intent stays actionable before the sweep retires it. */
export const INTENT_TTL_MINUTES = 30;

export interface MinutesRequirement {
  need: typeof IntentNeed.MINUTES;
  professional_id: string;
  call_type: CallType;
  minimum_seconds: number;
}

export interface WalletBalanceRequirement {
  need: typeof IntentNeed.WALLET_BALANCE;
  minimum_kobo: number;
}

export type IntentRequirement = MinutesRequirement | WalletBalanceRequirement;

export interface PurchaseIntentRow {
  id: string;
  user_id: string;
  need: IntentNeed;
  requirement: IntentRequirement;
  status: IntentStatus;
  satisfied_at: Date | null;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface IntentView {
  ref: string;
  status: IntentStatus;
  requirement: IntentRequirement;
  /** Where the relevant balance stands right now. */
  current_value: number;
  /** How far short the condition still is. Zero once satisfiable. */
  shortfall: number;
  expires_at: string;
  created_at: string;
}
