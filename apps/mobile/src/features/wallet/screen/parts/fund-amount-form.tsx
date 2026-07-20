import { AppButton, AppText, colors } from '@ohlify/mobile-ui';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { useConfigNumber } from '@shared/providers/app-config-provider';

const FALLBACK_MIN_KOBO = 50_000;
const FALLBACK_MAX_KOBO = 100_000_000;

export interface FundAmountFormProps {
  onSubmit: (formatted: string) => void;
}

/**
 * Tiny inline form for the funding amount. Mirrors _FundAmountForm in
 * mobile/lib/features/wallet/screen/wallet_screen.dart, extended with live
 * min/max validation sourced from `wallet.min_funding_kobo` /
 * `wallet.max_funding_kobo` public config — matches
 * apps/customer-web/src/features/wallet/screen/parts/fund-amount-modal-content.tsx.
 */
export function FundAmountForm({ onSubmit }: FundAmountFormProps) {
  const [raw, setRaw] = useState('');

  const minKobo = useConfigNumber('wallet.min_funding_kobo', FALLBACK_MIN_KOBO);
  const maxKobo = useConfigNumber('wallet.max_funding_kobo', FALLBACK_MAX_KOBO);
  const minNaira = minKobo / 100;
  const maxNaira = maxKobo / 100;

  function formatPrice(value: string): string {
    const digits = value.replace(/[^0-9]/g, '');
    if (!digits) return '';
    return `₦ ${digits.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')}`;
  }

  const digits = raw.replace(/[^0-9]/g, '');
  const naira = Number(digits) || 0;
  const entered = digits.length > 0;
  const tooLow = entered && naira < minNaira;
  const tooHigh = entered && naira > maxNaira;
  const isValid = entered && naira > 0 && !tooLow && !tooHigh;

  const errorMessage = tooLow
    ? `Minimum is ₦${minNaira.toLocaleString('en-NG')}`
    : tooHigh
      ? `Maximum is ₦${maxNaira.toLocaleString('en-NG')}`
      : undefined;

  return (
    <View>
      <AppText variant="body" color={colors.textMuted} align="left">
        Top up your wallet via Paystack. The amount will be credited after the payment is verified.
      </AppText>
      <View style={{ height: 16 }} />
      <TextInput
        autoFocus
        keyboardType="number-pad"
        value={raw}
        onChangeText={setRaw}
        placeholder={`e.g. ${minNaira.toLocaleString('en-NG')}`}
        style={{
          borderWidth: 1,
          borderColor: errorMessage ? colors.error : colors.border,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 12,
          fontFamily: 'MonaSans-Regular',
          fontSize: 16,
          color: colors.textJet,
        }}
      />
      {errorMessage ? (
        <>
          <View style={{ height: 6 }} />
          <AppText variant="bodySmall" color={colors.error} align="left">
            {errorMessage}
          </AppText>
        </>
      ) : (
        <>
          <View style={{ height: 6 }} />
          <AppText variant="bodySmall" color={colors.textSlate} align="left">
            {`Allowed range: ₦${minNaira.toLocaleString('en-NG')} – ₦${maxNaira.toLocaleString('en-NG')}`}
          </AppText>
        </>
      )}
      <View style={{ height: 16 }} />
      <AppButton label="Continue" expanded radius={100} isDisabled={!isValid} onPress={!isValid ? undefined : () => onSubmit(formatPrice(raw))} />
    </View>
  );
}
