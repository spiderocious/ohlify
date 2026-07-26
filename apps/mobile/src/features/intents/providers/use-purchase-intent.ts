import {
  IntentNeed,
  IntentStep,
  resolveStep,
  shortfallCostKobo,
  type IntentRequirement,
  type IntentView,
} from '@ohlify/core';
import { useCallback, useEffect, useState } from 'react';

import { apiErrorMessage, ApiError } from '@shared/types/api-error';
import { idempotencyKey } from '@shared/utils/idempotency';

import { minutesApi } from '@features/minutes/api/minutes-api';
import { walletApi } from '@features/wallet/api/wallet-api';

import { intentsApi } from '../api/intents-api';

export interface PurchaseIntentState {
  intent?: IntentView;
  step: IntentStep;
  walletBalanceKobo: number;
  perMinuteKobo: number;
  /** Smallest spend that clears the condition. Pre-fills the amount field. */
  suggestedAmountKobo: number;
  isLoading: boolean;
  isPurchasing: boolean;
  errorMessage?: string;
}

/**
 * Drives one purchase intent from declaration to server-confirmed satisfaction.
 *
 * The step is recomputed from live balances on every change rather than
 * advanced by hand, so a flow interrupted by a crash, a backgrounded app, or a
 * top-up completed on another device resumes at the right place instead of
 * trusting a checkpoint that has since gone stale.
 *
 * Nothing here reports success to the server; `verify` asks and the server
 * decides. A purchase that half-completed simply leaves the intent pending.
 */
export function usePurchaseIntent(requirement: IntentRequirement | undefined) {
  const [intent, setIntent] = useState<IntentView | undefined>(undefined);
  const [walletBalanceKobo, setWalletBalanceKobo] = useState(0);
  const [perMinuteKobo, setPerMinuteKobo] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const readWallet = useCallback(async () => {
    const wallet = await walletApi.getWallet();
    setWalletBalanceKobo(wallet.balanceKobo);
    return wallet.balanceKobo;
  }, []);

  const readRate = useCallback(async (req: IntentRequirement) => {
    if (req.need !== IntentNeed.MINUTES) return 0;
    // The snapshot on an existing balance is the price already locked in for
    // this pro; falling back to zero just leaves the amount unsuggested.
    const balance = await minutesApi.balanceForPro(req.professional_id, req.call_type);
    setPerMinuteKobo(balance.rateSnapshotKobo);
    return balance.rateSnapshotKobo;
  }, []);

  useEffect(() => {
    if (!requirement) return;
    let cancelled = false;
    setIsLoading(true);
    setErrorMessage(undefined);

    Promise.all([intentsApi.create(requirement), readWallet(), readRate(requirement)])
      .then(([created]) => {
        if (!cancelled) setIntent(created);
      })
      .catch((e: unknown) => {
        if (!cancelled) setErrorMessage(apiErrorMessage(e instanceof ApiError ? e : ApiError.network));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [requirement, readWallet, readRate]);

  /** Re-asks the server whether the condition now holds. */
  const verify = useCallback(async (): Promise<IntentView | undefined> => {
    if (!intent) return undefined;
    try {
      const fresh = await intentsApi.verify(intent.ref);
      setIntent(fresh);
      return fresh;
    } catch (e) {
      setErrorMessage(apiErrorMessage(e instanceof ApiError ? e : ApiError.network));
      return undefined;
    }
  }, [intent]);

  /**
   * Spends against the requirement, then asks the server to re-measure.
   *
   * The purchase and the confirmation are separate on purpose: if the buy
   * succeeds but the app dies before verifying, the money is still spent and a
   * later verify picks it up.
   */
  const purchase = useCallback(
    async (amountKobo: number): Promise<boolean> => {
      if (!intent || intent.requirement.need !== IntentNeed.MINUTES) return false;
      setIsPurchasing(true);
      setErrorMessage(undefined);
      try {
        await minutesApi.buyMinutes({
          professionalId: intent.requirement.professional_id,
          callType: intent.requirement.call_type,
          amountKobo,
          idempotencyKey: idempotencyKey(),
        });
        await readWallet();
        const fresh = await verify();
        return fresh?.shortfall === 0;
      } catch (e) {
        setErrorMessage(apiErrorMessage(e instanceof ApiError ? e : ApiError.network));
        return false;
      } finally {
        setIsPurchasing(false);
      }
    },
    [intent, readWallet, verify],
  );

  /** Called when the user returns from funding, to pick up the new balance. */
  const refreshWallet = useCallback(async () => {
    try {
      await readWallet();
    } catch {
      // A stale balance only mis-suggests an amount; the server still decides.
    }
  }, [readWallet]);

  const cancel = useCallback(async () => {
    if (!intent) return;
    try {
      await intentsApi.cancel(intent.ref);
    } catch {
      // Abandoning is best-effort — the expiry sweep retires it regardless.
    }
  }, [intent]);

  const context = { intent: intent!, walletBalanceKobo, perMinuteKobo, isPurchasing };
  const step = intent ? resolveStep(context) : IntentStep.CHOOSE_AMOUNT;
  const suggestedAmountKobo = intent ? shortfallCostKobo(context) : 0;

  const state: PurchaseIntentState = {
    intent,
    step,
    walletBalanceKobo,
    perMinuteKobo,
    suggestedAmountKobo,
    isLoading,
    isPurchasing,
    errorMessage,
  };

  return { ...state, purchase, verify, cancel, refreshWallet };
}
