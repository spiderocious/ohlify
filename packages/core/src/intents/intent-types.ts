/**
 * Purchase intents — "satisfy this condition, then let me carry on".
 *
 * Buying time mid-call, buying time from a professional's page, and topping up
 * a wallet are the same shape: something is blocked until a balance clears a
 * threshold. An intent names the condition; how it gets satisfied is the
 * flow's business, and whether it *is* satisfied is the server's.
 *
 * The client never asserts success. It hands back a ref and the server
 * re-evaluates the condition against live state, so an abandoned, failed, or
 * forged flow simply does not satisfy and the caller's guard holds.
 */

export const IntentNeed = {
  /** Prepaid seconds with a specific professional, for a specific call type. */
  MINUTES: 'minutes',
  /** Spendable wallet balance, regardless of what it will be spent on. */
  WALLET_BALANCE: 'wallet_balance',
} as const;

export type IntentNeed = (typeof IntentNeed)[keyof typeof IntentNeed];

export const IntentStatus = {
  /** Created; the condition is not met yet. */
  PENDING: 'pending',
  /** Re-checked against live state and satisfied. Terminal. */
  SATISFIED: 'satisfied',
  /** Timed out before being satisfied. Terminal. */
  EXPIRED: 'expired',
  /** Abandoned by the user. Terminal. */
  CANCELLED: 'cancelled',
} as const;

export type IntentStatus = (typeof IntentStatus)[keyof typeof IntentStatus];

export const TERMINAL_INTENT_STATUSES: readonly IntentStatus[] = [
  IntentStatus.SATISFIED,
  IntentStatus.EXPIRED,
  IntentStatus.CANCELLED,
];

export type CallChannel = 'audio' | 'video';

export interface MinutesRequirement {
  need: typeof IntentNeed.MINUTES;
  professional_id: string;
  call_type: CallChannel;
  /** Seconds the caller must hold with this professional before proceeding. */
  minimum_seconds: number;
}

export interface WalletBalanceRequirement {
  need: typeof IntentNeed.WALLET_BALANCE;
  minimum_kobo: number;
}

export type IntentRequirement = MinutesRequirement | WalletBalanceRequirement;

export interface IntentView {
  ref: string;
  status: IntentStatus;
  requirement: IntentRequirement;
  /** Where the balance stands right now, against `shortfall`'s zero point. */
  current_value: number;
  /** How far short the condition still is. Zero once satisfiable. */
  shortfall: number;
  expires_at: string;
  created_at: string;
}

/**
 * The step the UI should render.
 *
 * Derived from the intent plus the wallet, never stored: a flow that resumes
 * after a crash recomputes its position from live balances rather than trusting
 * a checkpoint that may no longer be true.
 */
export const IntentStep = {
  /** Condition already met — nothing to buy. */
  ALREADY_SATISFIED: 'already_satisfied',
  /** Wallet covers it; collect the amount and purchase. */
  CHOOSE_AMOUNT: 'choose_amount',
  /** Wallet is short; fund it first (the one permitted nested flow). */
  FUND_WALLET: 'fund_wallet',
  /** Purchase in flight. */
  PURCHASING: 'purchasing',
  /** Server confirmed the condition. Terminal. */
  DONE: 'done',
  /** Expired or cancelled. Terminal. */
  ABANDONED: 'abandoned',
} as const;

export type IntentStep = (typeof IntentStep)[keyof typeof IntentStep];
