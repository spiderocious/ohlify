import { AppButton, AppText, colors } from '@ohlify/mobile-ui';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

export interface FundAmountFormProps {
  onSubmit: (formatted: string) => void;
}

/** Tiny inline form for the funding amount. Mirrors _FundAmountForm in mobile/lib/features/wallet/screen/wallet_screen.dart. */
export function FundAmountForm({ onSubmit }: FundAmountFormProps) {
  const [raw, setRaw] = useState('');

  function formatPrice(value: string): string {
    const digits = value.replace(/[^0-9]/g, '');
    if (!digits) return '';
    return `₦ ${digits.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')}`;
  }

  const digits = raw.replace(/[^0-9]/g, '');
  const isValid = digits.length > 0 && Number(digits) > 0;

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
        placeholder="e.g. 5000"
        style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontFamily: 'MonaSans-Regular', fontSize: 16, color: colors.textJet }}
      />
      <View style={{ height: 16 }} />
      <AppButton label="Continue" expanded radius={100} isDisabled={!isValid} onPress={!isValid ? undefined : () => onSubmit(formatPrice(raw))} />
    </View>
  );
}
