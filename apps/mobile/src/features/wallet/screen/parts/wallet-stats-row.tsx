import { AppSvg, AppText, colors, type AppSvgName } from '@ohlify/mobile-ui';
import { View } from 'react-native';

export interface WalletStatsRowData {
  thisWeek: number;
  thisMonth: number;
  totalCalls: number;
}

export interface WalletStatsRowProps {
  stats: WalletStatsRowData;
}

/** Mirrors mobile/lib/features/wallet/screen/parts/wallet_stats_row.dart. */
export function WalletStatsRow({ stats }: WalletStatsRowProps) {
  return (
    <View style={{ flexDirection: 'row' }}>
      <View style={{ flex: 1 }}>
        <StatCard icon="weekIcon" label="This week" value={String(stats.thisWeek)} />
      </View>
      <View style={{ width: 12 }} />
      <View style={{ flex: 1 }}>
        <StatCard icon="monthIcon" label="This month" value={String(stats.thisMonth)} />
      </View>
      <View style={{ width: 12 }} />
      <View style={{ flex: 1 }}>
        <StatCard icon="totalCallsIcon" label="Total calls" value={String(stats.totalCalls)} />
      </View>
    </View>
  );
}

function StatCard({ icon, label, value }: { icon: AppSvgName; label: string; value: string }) {
  return (
    <View style={{ padding: 14, backgroundColor: colors.background, borderRadius: 16, borderWidth: 1, borderColor: colors.border }}>
      <AppSvg name={icon} size={32} />
      <View style={{ height: 12 }} />
      <AppText variant="label" color={colors.textMuted} align="left">
        {label}
      </AppText>
      <View style={{ height: 4 }} />
      <AppText variant="medium" color={colors.textJet} align="left">
        {value}
      </AppText>
    </View>
  );
}
