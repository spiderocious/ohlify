import { AmountVisibilityToggle, AnimatedBalance, AppText, colors } from '@ohlify/mobile-ui';
import { Pressable, View } from 'react-native';

import { formatKobo } from '@features/wallet/types/wallet-models';

export interface EarningsRowProps {
  todayKobo: number;
  weekKobo: number;
  withdrawableKobo: number;
  onWithdraw: () => void;
}

function Stat({ label, kobo }: { label: string; kobo: number }) {
  return (
    <View style={{ flex: 1 }}>
      <AppText variant="bodySmall" color={colors.textMuted} align="left">
        {label}
      </AppText>
      <View style={{ height: 2 }} />
      <AnimatedBalance
        value={kobo}
        format={(v) => formatKobo(v)}
        variant="body"
        weight="700"
        color={colors.textJet}
        align="left"
      />
    </View>
  );
}

/**
 * Today, this week, and what can actually be withdrawn.
 *
 * All three are net of the platform fee — showing gross would overstate every
 * figure by the commission and turn the wallet into a surprise.
 */
export function EarningsRow({
  todayKobo,
  weekKobo,
  withdrawableKobo,
  onWithdraw,
}: EarningsRowProps) {
  return (
    <View style={{ padding: 18, borderRadius: 18, backgroundColor: colors.surface }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <AppText variant="bodySmall" weight="600" color={colors.textSlate} align="left">
          Earnings
        </AppText>
        <View style={{ width: 2 }} />
        <AmountVisibilityToggle size={16} color={colors.textSlate} />
      </View>
      <View style={{ height: 12 }} />
      <View style={{ flexDirection: 'row' }}>
        <Stat label="Today" kobo={todayKobo} />
        <Stat label="This week" kobo={weekKobo} />
      </View>
      <View style={{ height: 14 }} />
      <Pressable onPress={onWithdraw}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 12,
            paddingHorizontal: 14,
            borderRadius: 12,
            backgroundColor: colors.background,
          }}
        >
          <View style={{ flex: 1 }}>
            <AppText variant="bodySmall" color={colors.textMuted} align="left">
              Available to withdraw
            </AppText>
            <AnimatedBalance
              value={withdrawableKobo}
              format={(v) => formatKobo(v)}
              variant="body"
              weight="700"
              color={colors.primary}
              align="left"
            />
          </View>
          <AppText variant="bodySmall" weight="600" color={colors.primary}>
            Withdraw
          </AppText>
        </View>
      </Pressable>
    </View>
  );
}
