import { secondsForKobo } from '../time/format-duration.js';

import {
  IntentNeed,
  IntentStatus,
  IntentStep,
  TERMINAL_INTENT_STATUSES,
  type IntentRequirement,
  type IntentView,
} from './intent-types.js';

export interface IntentContext {
  intent: IntentView;
  /** Spendable wallet balance, in kobo. */
  walletBalanceKobo: number;
  /** The professional's per-minute price. Only consulted for `minutes` intents. */
  perMinuteKobo: number;
  /** True while a purchase request is in flight. */
  isPurchasing?: boolean;
}

/**
 * What it costs, in kobo, to close the gap the intent still has.
 *
 * For seconds this converts the shortfall back through the per-minute rate and
 * rounds UP — buying the exact floor would land a second short and leave the
 * condition unmet, which is the one outcome the whole flow exists to avoid.
 */
export function shortfallCostKobo(context: IntentContext): number {
  const { intent, perMinuteKobo } = context;
  if (intent.shortfall <= 0) return 0;
  if (intent.requirement.need === IntentNeed.WALLET_BALANCE) return intent.shortfall;
  if (perMinuteKobo <= 0) return 0;
  return Math.ceil((intent.shortfall * perMinuteKobo) / 60);
}

/**
 * Where the flow stands, computed fresh from live balances.
 *
 * Nothing here is persisted: a flow resumed after a crash re-derives its step
 * rather than trusting a checkpoint that may have gone stale while the app was
 * closed.
 */
export function resolveStep(context: IntentContext): IntentStep {
  const { intent, walletBalanceKobo, isPurchasing } = context;

  if (intent.status === IntentStatus.SATISFIED) return IntentStep.DONE;
  if (TERMINAL_INTENT_STATUSES.includes(intent.status)) return IntentStep.ABANDONED;
  if (intent.shortfall <= 0) return IntentStep.ALREADY_SATISFIED;
  if (isPurchasing === true) return IntentStep.PURCHASING;

  const needed = shortfallCostKobo(context);
  return walletBalanceKobo >= needed ? IntentStep.CHOOSE_AMOUNT : IntentStep.FUND_WALLET;
}

/**
 * The smallest top-up that clears the condition, in kobo.
 *
 * Only ever the gap — funding suggestions above this are the UI's call, not
 * the machine's.
 */
export function fundingShortfallKobo(context: IntentContext): number {
  const needed = shortfallCostKobo(context);
  return Math.max(0, needed - context.walletBalanceKobo);
}

/** What a given spend buys against this requirement, for a live preview under the amount field. */
export function previewPurchase(
  requirement: IntentRequirement,
  amountKobo: number,
  perMinuteKobo: number,
): { seconds: number; kobo: number } {
  if (requirement.need === IntentNeed.WALLET_BALANCE) {
    return { seconds: 0, kobo: amountKobo };
  }
  return { seconds: secondsForKobo(amountKobo, perMinuteKobo), kobo: amountKobo };
}
