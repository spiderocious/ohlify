import { formatNaira, formatSecondsAsDuration, secondsForKobo } from '@ohlify/core';
import { AppButton, AppText, colors } from '@ohlify/mobile-ui';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

export interface IntentAmountFormProps {
  perMinuteKobo: number;
  /** Smallest spend that clears the condition — pre-fills the field. */
  suggestedAmountKobo: number;
  walletBalanceKobo: number;
  isSaving: boolean;
  errorMessage?: string;
  onConfirm: (amountKobo: number) => void;
}

const nairaFrom = (raw: string): number => Number(raw.replace(/[^0-9]/g, '')) || 0;

const formatWithSeparators = (raw: string): string => {
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return '';
  return digits.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
};

/**
 * Amount entry for a minutes purchase, pre-filled with the least that clears
 * the requirement.
 *
 * The live preview shows what the spend buys in talk time rather than in
 * minutes bought — the balance is seconds, and quoting a rounded minute count
 * here would disagree with what the call screen counts down.
 */
export function IntentAmountForm({
  perMinuteKobo,
  suggestedAmountKobo,
  walletBalanceKobo,
  isSaving,
  errorMessage,
  onConfirm,
}: IntentAmountFormProps) {
  const [raw, setRaw] = useState(
    suggestedAmountKobo > 0 ? String(Math.ceil(suggestedAmountKobo / 100)) : '',
  );

  const naira = nairaFrom(raw);
  const amountKobo = naira * 100;
  const entered = amountKobo > 0;
  const overBalance = entered && amountKobo > walletBalanceKobo;
  const isValid = entered && !overBalance;
  const buysSeconds = secondsForKobo(amountKobo, perMinuteKobo);

  const inlineError = overBalance
    ? `That's more than your wallet balance of ${formatNaira(walletBalanceKobo)}.`
    : errorMessage;

  return (
    <View>
      <AppText variant="body" color={colors.textMuted} align="left">
        {perMinuteKobo > 0
          ? `${formatNaira(perMinuteKobo)} per minute · wallet ${formatNaira(walletBalanceKobo)}`
          : `Wallet balance ${formatNaira(walletBalanceKobo)}`}
      </AppText>
      <View style={{ height: 14 }} />
      <TextInput
        autoFocus
        keyboardType="number-pad"
        value={formatWithSeparators(raw)}
        onChangeText={setRaw}
        placeholder="Amount in naira"
        editable={!isSaving}
        style={{
          borderWidth: 1,
          borderColor: inlineError ? colors.error : colors.border,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontFamily: 'MonaSans-Regular',
          fontSize: 16,
          color: colors.textJet,
        }}
      />
      {inlineError ? (
        <>
          <View style={{ height: 6 }} />
          <AppText variant="bodySmall" color={colors.error} align="left">
            {inlineError}
          </AppText>
        </>
      ) : buysSeconds > 0 ? (
        <>
          <View style={{ height: 6 }} />
          <AppText variant="bodySmall" color={colors.textSlate} align="left">
            {`Buys about ${formatSecondsAsDuration(buysSeconds)} of talk time`}
          </AppText>
        </>
      ) : null}
      <View style={{ height: 18 }} />
      <AppButton
        label={isSaving ? 'Buying…' : 'Buy minutes'}
        expanded
        radius={100}
        isDisabled={!isValid || isSaving}
        onPress={!isValid || isSaving ? undefined : () => onConfirm(amountKobo)}
      />
    </View>
  );
}
