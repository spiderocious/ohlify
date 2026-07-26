import { formatNaira } from '@ohlify/core';
import { AppButton, AppIcon, AppText, colors } from '@ohlify/mobile-ui';
import { View } from 'react-native';

export interface IntentFundPromptProps {
  shortfallKobo: number;
  walletBalanceKobo: number;
  onFundWallet: () => void;
}

/**
 * The one permitted nested flow: the wallet cannot cover the purchase, so
 * funding has to happen first.
 *
 * Deliberately a dead end rather than an inline funding form — Paystack owns
 * that step, and the user comes back through `refreshWallet` when it settles.
 */
export function IntentFundPrompt({
  shortfallKobo,
  walletBalanceKobo,
  onFundWallet,
}: IntentFundPromptProps) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: `${colors.warning}1F`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AppIcon name="warning" size={24} color={colors.warning} />
      </View>
      <View style={{ height: 14 }} />
      <AppText variant="body" weight="600" color={colors.textJet} align="center">
        Your wallet is short by {formatNaira(shortfallKobo)}
      </AppText>
      <View style={{ height: 6 }} />
      <AppText variant="bodySmall" color={colors.textMuted} align="center">
        {`You have ${formatNaira(walletBalanceKobo)}. Fund your wallet, then come back to finish.`}
      </AppText>
      <View style={{ height: 20 }} />
      <AppButton label="Fund wallet" expanded radius={100} onPress={onFundWallet} />
    </View>
  );
}
