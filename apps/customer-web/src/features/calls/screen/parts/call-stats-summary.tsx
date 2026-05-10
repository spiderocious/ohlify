import { IconCalendar, IconPhoneCall } from '@icons';

import type { CallStats } from '@ohlify/core';
import { AppText } from '@ohlify/ui';

interface CallStatsSummaryProps {
  stats: CallStats;
}

/** Mirrors mobile/lib/features/calls/screen/parts/call_stats_summary.dart. */
export function CallStatsSummary({ stats }: CallStatsSummaryProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <StatCard label="Total" value={stats.total} icon={<IconPhoneCall size={18} />} />
      <StatCard label="This month" value={stats.thisMonth} icon={<IconCalendar size={18} />} />
      <StatCard label="This week" value={stats.thisWeek} icon={<IconCalendar size={18} />} />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-background p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-surface-dark text-primary">
        {icon}
      </div>
      <AppText variant="title" weight={800} align="start" className="mt-3">
        {value}
      </AppText>
      <AppText variant="bodyNormal" align="start" color="var(--ohl-text-muted)">
        {label}
      </AppText>
    </div>
  );
}
