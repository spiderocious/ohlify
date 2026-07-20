import { useState } from 'react';
import { View } from 'react-native';

import { AppButton } from '../../primitives/app-button/app-button';
import { AppText } from '../../primitives/app-text/app-text';
import { AppTextInput } from '../../primitives/app-text-input/app-text-input';
import { colors } from '../../theme/colors';

/**
 * Edits a single rate's price. Backend PATCH /me/rates/{id} only allows
 * updating price_kobo — call type + duration are read-only. 1:1 with
 * mobile/lib/ui/widgets/edit_rate_form/edit_rate_form.dart.
 */
export interface EditRateFormProps {
  /** 'audio' or 'video' — pre-formatted for display. */
  callType: string;
  durationMinutes: number;
  /** Pretty current price (e.g. '₦5,000') so the user has context. */
  currentPriceLabel: string;
  /** Called with the new price in kobo (integer). */
  onSave: (priceKobo: number) => void;
  submitLabel?: string;
}

export function EditRateForm({
  callType,
  durationMinutes,
  currentPriceLabel,
  onSave,
  submitLabel = 'Save',
}: EditRateFormProps) {
  const [amount, setAmount] = useState('');

  const priceKobo = (() => {
    const clean = amount.replace(/[^0-9.]/g, '');
    if (!clean) return 0;
    const naira = Number(clean) || 0;
    return Math.round(naira * 100);
  })();
  const isValid = priceKobo > 0;
  const typeLabel = callType === 'video' ? 'Video call' : 'Audio call';

  return (
    <View>
      <AppText variant="body" color={colors.textMuted} align="left">
        {`Update the price for your ${typeLabel} · ${durationMinutes} mins rate.`}
      </AppText>
      <View style={{ height: 16 }} />
      <View style={{ flexDirection: 'row' }}>
        <View style={{ flex: 1 }}>
          <ReadOnlyField label="Call type" value={typeLabel} />
        </View>
        <View style={{ width: 12 }} />
        <View style={{ flex: 1 }}>
          <ReadOnlyField label="Duration" value={`${durationMinutes} minutes`} />
        </View>
      </View>
      <View style={{ height: 14 }} />
      <AppTextInput
        label={`New price (current: ${currentPriceLabel})`}
        value={amount}
        placeholder="Enter new amount in naira"
        keyboardType="decimal-pad"
        onChangeText={setAmount}
      />
      <View style={{ height: 20 }} />
      <AppButton
        label={submitLabel}
        expanded
        radius={100}
        isDisabled={!isValid}
        onPress={!isValid ? undefined : () => onSave(priceKobo)}
      />
    </View>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <AppText variant="bodyNormal" color={colors.textMuted} weight="500" align="left">
        {label}
      </AppText>
      <View style={{ height: 6 }} />
      <View
        style={{
          paddingHorizontal: 14,
          paddingVertical: 14,
          backgroundColor: colors.surfaceLight,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <AppText variant="body" color={colors.textJet} weight="500" align="left">
          {value}
        </AppText>
      </View>
    </View>
  );
}
