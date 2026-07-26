import * as minutesRepo from '@features/minutes/minutes.repo.js';
import { readUserAvailableBalance } from '@lib/wallet/index.js';

import { IntentNeed, type IntentRequirement } from './intents.types.js';

export interface ConditionState {
  /** Where the relevant balance stands right now, in the requirement's own unit. */
  currentValue: number;
  /** How far short the condition still is. Zero once satisfiable. */
  shortfall: number;
  satisfied: boolean;
}

/**
 * Measures a requirement against live state.
 *
 * This is the whole trust boundary: the client reports nothing about what it
 * bought, and satisfaction is decided here by reading the same balances the
 * blocked action will read. However the user got there — bought time, funded
 * first, was gifted an admin credit, had a refund land — the answer is the
 * same, which is what lets the flow stay indifferent to its own steps.
 */
export const evaluateCondition = async (
  userId: string,
  requirement: IntentRequirement,
): Promise<ConditionState> => {
  if (requirement.need === IntentNeed.WALLET_BALANCE) {
    const balanceKobo = Number(await readUserAvailableBalance(userId));
    return measure(balanceKobo, requirement.minimum_kobo);
  }

  const balance = await minutesRepo.findBalance(
    userId,
    requirement.professional_id,
    requirement.call_type,
  );
  return measure(balance?.seconds_remaining ?? 0, requirement.minimum_seconds);
};

const measure = (current: number, required: number): ConditionState => ({
  currentValue: current,
  shortfall: Math.max(0, required - current),
  satisfied: current >= required,
});
