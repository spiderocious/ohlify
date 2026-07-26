import { fundingShortfallKobo, IntentStep, type IntentRequirement } from '@ohlify/core';
import { AppText, colors } from '@ohlify/mobile-ui';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { usePurchaseIntent } from '../providers/use-purchase-intent';
import { IntentAmountForm } from './parts/intent-amount-form';
import { IntentFundPrompt } from './parts/intent-fund-prompt';

export interface PurchaseIntentFlowProps {
  requirement: IntentRequirement;
  /** Fires once the server confirms the condition holds. */
  onSatisfied: () => void;
  /** Hands off to the wallet funding screen; the flow resumes on return. */
  onFundWallet: () => void;
  onAbandon: () => void;
}

/**
 * Renders whichever step the intent is actually at.
 *
 * The step comes from live balances rather than from a click history, so this
 * component has no notion of "next" — it just draws the current answer to
 * "what is still missing?", which is what lets the flow survive being
 * backgrounded mid-purchase or satisfied on another device.
 */
export function PurchaseIntentFlow({
  requirement,
  onSatisfied,
  onFundWallet,
  onAbandon,
}: PurchaseIntentFlowProps) {
  const flow = usePurchaseIntent(requirement);

  const satisfied =
    flow.step === IntentStep.DONE || flow.step === IntentStep.ALREADY_SATISFIED;

  useEffect(() => {
    if (satisfied) onSatisfied();
  }, [satisfied, onSatisfied]);

  useEffect(() => {
    if (flow.step === IntentStep.ABANDONED) onAbandon();
  }, [flow.step, onAbandon]);

  if (flow.isLoading) {
    return (
      <View style={{ paddingVertical: 40, alignItems: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!flow.intent) {
    return (
      <View style={{ paddingVertical: 24 }}>
        <AppText variant="body" color={colors.error} align="center">
          {flow.errorMessage ?? 'Could not start this purchase. Try again.'}
        </AppText>
      </View>
    );
  }

  if (satisfied) {
    return (
      <View style={{ paddingVertical: 40, alignItems: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (flow.step === IntentStep.FUND_WALLET) {
    return (
      <IntentFundPrompt
        shortfallKobo={fundingShortfallKobo({
          intent: flow.intent,
          walletBalanceKobo: flow.walletBalanceKobo,
          perMinuteKobo: flow.perMinuteKobo,
        })}
        walletBalanceKobo={flow.walletBalanceKobo}
        onFundWallet={onFundWallet}
      />
    );
  }

  return (
    <IntentAmountForm
      perMinuteKobo={flow.perMinuteKobo}
      suggestedAmountKobo={flow.suggestedAmountKobo}
      walletBalanceKobo={flow.walletBalanceKobo}
      isSaving={flow.isPurchasing}
      errorMessage={flow.errorMessage}
      onConfirm={(amountKobo) => void flow.purchase(amountKobo)}
    />
  );
}
