import { AppButton, AppText, AppTextInput, colors } from '@ohlify/mobile-ui';
import { useState } from 'react';
import { View } from 'react-native';

export interface BuyMinutesFormProps {
  perMinuteKobo: number;
  onChanged: (value: string) => void;
  onConfirm: () => void;
  /** True while the caller's purchase is in flight — disables the input, shows a spinner on the button. */
  isSaving?: boolean;
  /** Purchase failure message from the caller, rendered inline instead of a toast. Not used for insufficient_balance, which gets its own full modal instead — see MinuteRow.buy in buy-minutes-section.tsx. */
  errorMessage?: string;
}

/** Mirrors _BuyForm in mobile/lib/features/professional_details/screen/parts/buy_minutes_section.dart. */
export function BuyMinutesForm({ perMinuteKobo, onChanged, onConfirm, isSaving = false, errorMessage }: BuyMinutesFormProps) {
  const [amount, setAmount] = useState('');

  const estMinutes = (() => {
    if (perMinuteKobo <= 0) return 0;
    const clean = amount.replace(/[^0-9.]/g, '');
    const naira = Number(clean) || 0;
    const kobo = Math.round(naira * 100);
    return Math.floor(kobo / perMinuteKobo);
  })();

  return (
    <View>
      <AppText variant="body" color={colors.textMuted} align="left">
        Enter how much to spend. Minutes are funded from your wallet.
      </AppText>
      <View style={{ height: 14 }} />
      <AppTextInput
        label="Amount"
        value={amount}
        placeholder="Enter amount"
        keyboardType="decimal-pad"
        disabled={isSaving}
        onChangeText={(v) => {
          setAmount(v);
          onChanged(v);
        }}
      />
      {estMinutes > 0 ? (
        <>
          <View style={{ height: 6 }} />
          <AppText variant="bodySmall" color={colors.textMuted} align="left">
            {`≈ ${estMinutes} minutes`}
          </AppText>
        </>
      ) : null}
      {errorMessage ? (
        <>
          <View style={{ height: 10 }} />
          <AppText variant="bodySmall" color={colors.error} align="left">
            {errorMessage}
          </AppText>
        </>
      ) : null}
      <View style={{ height: 20 }} />
      <AppButton
        label="Buy minutes"
        expanded
        radius={100}
        isLoading={isSaving}
        isDisabled={estMinutes <= 0}
        onPress={estMinutes <= 0 ? undefined : onConfirm}
      />
    </View>
  );
}
