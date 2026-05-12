import type { WalletStats } from '@ohlify/core';
import { AppText } from '@ohlify/ui';

interface WalletStatsRowProps {
  stats: WalletStats;
}

/** Mirrors mobile/lib/features/wallet/screen/parts/wallet_stats_row.dart. */
export function WalletStatsRow({ stats }: WalletStatsRowProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <Cell label="This week" value={stats.thisWeek} />
      <Cell label="This month" value={stats.thisMonth} />
      <Cell label="Total calls" value={stats.totalCalls} />
    </div>
  );
}

function Cell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-background p-3.5">
      <AppText variant="bodyTitle" weight={700} align="start" color="var(--ohl-text-jet)">
        {value}
      </AppText>
      <AppText variant="bodyNormal" align="start" color="var(--ohl-text-muted)">
        {label}
      </AppText>
    </div>
  );
}
