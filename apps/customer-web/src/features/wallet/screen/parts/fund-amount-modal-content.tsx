import { useState } from 'react';

import { AppButton, AppText, AppTextInput } from '@ohlify/ui';

import { useConfigNumber } from '../../../../shared/providers/app-config-provider.js';

const FALLBACK_MIN_KOBO = 50_000;
const FALLBACK_MAX_KOBO = 100_000_000;

interface FundAmountModalContentProps {
  /** Pre-filled amount in naira (e.g. from a "short by" calculation). */
  defaultAmountNaira?: number;
  /**
   * Called when the user confirms an amount. Must return a Promise that
   * resolves once the next step (Paystack checkout open / redirect) is
   * visibly underway. The modal stays open with a "Preparing checkout…"
   * spinner until this resolves, then auto-dismisses. If the promise
   * rejects, the spinner clears and the user can retry.
   */
  onSubmit: (amountKobo: number) => Promise<void>;
  /** Invoked after a successful submit so the host can dismiss this modal. */
  onSuccess?: () => void;
}

export function FundAmountModalContent({
  defaultAmountNaira,
  onSubmit,
  onSuccess,
}: FundAmountModalContentProps) {
  const minKobo = useConfigNumber('wallet.min_funding_kobo', FALLBACK_MIN_KOBO);
  const maxKobo = useConfigNumber('wallet.max_funding_kobo', FALLBACK_MAX_KOBO);
  const minNaira = minKobo / 100;
  const maxNaira = maxKobo / 100;

  const [raw, setRaw] = useState(defaultAmountNaira ? String(Math.ceil(defaultAmountNaira)) : '');
  const [isPreparing, setIsPreparing] = useState(false);

  const naira = Number(raw);
  const tooLow = !Number.isNaN(naira) && naira < minNaira;
  const tooHigh = !Number.isNaN(naira) && naira > maxNaira;
  const isValid = !Number.isNaN(naira) && !tooLow && !tooHigh && raw !== '';

  const errorMessage =
    raw !== '' && tooLow
      ? `Minimum is ₦${minNaira.toLocaleString('en-NG')}`
      : raw !== '' && tooHigh
        ? `Maximum is ₦${maxNaira.toLocaleString('en-NG')}`
        : undefined;

  const handlePress = async () => {
    if (!isValid || isPreparing) return;
    setIsPreparing(true);
    try {
      await onSubmit(Math.round(naira * 100));
      onSuccess?.();
    } catch {
      setIsPreparing(false);
    }
  };

  return (
    <div className="space-y-4">
      <AppText variant="body" align="start" color="var(--ohl-text-muted)">
        Minimum top-up is ₦{minNaira.toLocaleString('en-NG')}. You will be redirected to Paystack to complete payment.
      </AppText>
      <AppTextInput
        label="Amount (₦)"
        placeholder={String(minNaira)}
        charSupported="number"
        inputMode="numeric"
        value={raw}
        onChange={setRaw}
        disabled={isPreparing}
        errorMessage={errorMessage}
      />
      <AppButton
        label={isPreparing ? 'Preparing checkout…' : 'Continue to payment'}
        expanded
        radius={100}
        isDisabled={!isValid}
        isLoading={isPreparing}
        onPressed={handlePress}
      />
    </div>
  );
}
