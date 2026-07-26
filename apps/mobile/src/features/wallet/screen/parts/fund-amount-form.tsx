import { AppButton, AppText, colors } from '@ohlify/mobile-ui';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { useConfigNumber, useConfigString } from '@shared/providers/app-config-provider';

const FALLBACK_MIN_KOBO = 50_000;
const FALLBACK_MAX_KOBO = 100_000_000;
const FALLBACK_FEE_BPS = 150;
const FALLBACK_FEE_FLAT_KOBO = 10_000;
const FALLBACK_FEE_CAP_KOBO = 200_000;

const formatNaira = (kobo: number): string => `₦${(kobo / 100).toLocaleString('en-NG')}`;

function BreakdownRow({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
      <AppText
        variant="bodySmall"
        color={emphasis ? colors.textJet : colors.textSlate}
        weight={emphasis ? '600' : '400'}
        align="left"
      >
        {label}
      </AppText>
      <AppText
        variant="bodySmall"
        color={emphasis ? colors.textJet : colors.textSlate}
        weight={emphasis ? '600' : '400'}
        align="right"
      >
        {value}
      </AppText>
    </View>
  );
}

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
  const feeMode = useConfigString('wallet.funding_fee_mode', 'pass_on');
  const feeBps = useConfigNumber('wallet.funding_fee_bps', FALLBACK_FEE_BPS);
  const feeFlatKobo = useConfigNumber('wallet.funding_fee_flat_kobo', FALLBACK_FEE_FLAT_KOBO);
  const feeCapKobo = useConfigNumber('wallet.funding_fee_cap_kobo', FALLBACK_FEE_CAP_KOBO);
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

  // Mirrors computeFundingCharge on the backend. Quoted here so the total is
  // visible before Paystack opens, rather than surfacing as an unexplained
  // gap between what was charged and what landed.
  const creditKobo = naira * 100;
  const feeKobo = Math.min(
    Math.ceil((creditKobo * feeBps) / 10_000) + feeFlatKobo,
    feeCapKobo,
  );
  const passOn = feeMode === 'pass_on';
  const chargeKobo = passOn ? creditKobo + feeKobo : creditKobo;

  return (
    <View>
      <AppText variant="body" color={colors.textMuted} align="left">
        {passOn
          ? 'Enter how much you want in your wallet. Paystack’s processing fee is added on top and shown before you pay.'
          : 'Top up your wallet via Paystack. The amount will be credited after the payment is verified.'}
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
      {isValid && passOn ? (
        <>
          <View style={{ height: 16 }} />
          <View
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 10,
              backgroundColor: colors.surface,
            }}
          >
            <BreakdownRow label="Credited to wallet" value={formatNaira(creditKobo)} />
            <BreakdownRow label="Processing fee" value={formatNaira(feeKobo)} />
            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />
            <BreakdownRow label="You'll be charged" value={formatNaira(chargeKobo)} emphasis />
          </View>
        </>
      ) : null}
      <View style={{ height: 16 }} />
      <AppButton label="Continue" expanded radius={100} isDisabled={!isValid} onPress={!isValid ? undefined : () => onSubmit(formatPrice(raw))} />
    </View>
  );
}
