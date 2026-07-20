import { AppButton, AppText, AppTextInput, colors } from '@ohlify/mobile-ui';
import { useState } from 'react';
import { View } from 'react-native';

export interface WithdrawModalContentProps {
  /** Called with the formatted amount (e.g. '₦20,000.00') when the user confirms. */
  onSubmit: (formatted: string) => void;
}

/** Mirrors mobile/lib/features/wallet/screen/parts/withdraw_modal_content.dart. */
export function WithdrawModalContent({ onSubmit }: WithdrawModalContentProps) {
  const [raw, setRaw] = useState('');

  const isValid = /^\d+$/.test(raw) && Number(raw) > 0;
  const formatted = `₦${(Number(raw) || 0).toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')}.00`;

  return (
    <View>
      <AppText variant="body" color={colors.textMuted} align="left">
        Adding your bank account will affect where you receive your payouts
      </AppText>
      <View style={{ height: 20 }} />
      <AppTextInput label="Amount to withdraw" value={raw} onChangeText={setRaw} placeholder="₦" keyboardType="number-pad" charSupported="number" />
      <View style={{ height: 20 }} />
      <AppButton label="Proceed" expanded radius={100} isDisabled={!isValid} onPress={!isValid ? undefined : () => onSubmit(formatted)} />
    </View>
  );
}
