import { AnimatedBalance, AppText, ProfessionalView, colors } from '@ohlify/mobile-ui';
import { Pressable, View } from 'react-native';

import { formatKobo } from '@features/wallet/types/wallet-models';

export interface WalletBalanceCardProps {
  balanceKobo: number;
  currency?: string;
  onWithdraw: () => void;
}

/**
 * Mirrors mobile/lib/features/wallet/screen/parts/wallet_balance_card.dart.
 * Withdraw is a payout of earnings, so it's professional-only. Balance
 * counts up/down from its previous value on change (funding, withdrawal,
 * refresh) rather than snapping — money screens are where users pay the
 * most attention, so this is the highest-payoff single animation in the app.
 */
export function WalletBalanceCard({ balanceKobo, currency = 'NGN', onWithdraw }: WalletBalanceCardProps) {
  return (
    <View style={{ padding: 24, backgroundColor: colors.primary, borderRadius: 20, flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ flex: 1 }}>
        <AppText variant="body" color={colors.textWhite} align="left">
          Wallet balance
        </AppText>
        <View style={{ height: 6 }} />
        <AnimatedBalance
          value={balanceKobo}
          format={(kobo) => formatKobo(kobo, currency)}
          variant="header"
          color={colors.textWhite}
          align="left"
          weight="700"
        />
        <ProfessionalView>
          <View style={{ height: 20 }} />
          <WithdrawButton onPress={onWithdraw} />
        </ProfessionalView>
      </View>
      <View style={{ width: 16 }} />
      <DecorativeGrid />
    </View>
  );
}

function WithdrawButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <View style={{ paddingHorizontal: 24, paddingVertical: 14, backgroundColor: colors.background, borderRadius: 100 }}>
        <AppText variant="body" color={colors.primary} weight="600" align="center">
          Withdraw funds
        </AppText>
      </View>
    </Pressable>
  );
}

function DecorativeGrid() {
  const cellColor = '#5A50E8';
  const checkColor = '#7B73ED';
  return (
    <View style={{ width: 88, height: 88, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      <GridCell color={cellColor} />
      <GridCell color={checkColor} hasCheck />
      <GridCell color={checkColor} hasCheck />
      <GridCell color={cellColor} />
    </View>
  );
}

function GridCell({ color, hasCheck = false }: { color: string; hasCheck?: boolean }) {
  return (
    <View style={{ width: 41, height: 41, backgroundColor: color, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
      {hasCheck ? <AppIcon name="check" size={16} color={colors.textWhite} /> : null}
    </View>
  );
}
