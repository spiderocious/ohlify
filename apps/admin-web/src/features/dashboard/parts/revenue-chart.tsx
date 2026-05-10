import { useMemo } from 'react';

import { AppText, cn } from '@ohlify/ui';
import type { AdminMetricsRevenuePoint } from '@ohlify/api';

import { formatKobo } from '../../../shared/format/kobo.js';

interface RevenueChartProps {
  points: ReadonlyArray<AdminMetricsRevenuePoint> | undefined;
  className?: string;
}

/**
 * Pure-CSS bar chart of settlement volume per bucket. The fee portion is
 * stacked inside each bar so the operator sees revenue-to-volume ratio at
 * a glance. We deliberately avoid a chart library — admin volumes are
 * small and a single SVG-free stack is enough.
 */
export function RevenueChart({ points, className }: RevenueChartProps) {
  const data = useMemo(() => {
    if (!points || points.length === 0) return null;
    const numeric = points.map((p) => ({
      bucket: p.bucket_start,
      volume: toNumber(p.total_volume_kobo),
      fee: toNumber(p.total_fee_kobo),
      count: p.settlement_count ?? 0,
    }));
    const max = Math.max(1, ...numeric.map((p) => p.volume));
    return { numeric, max };
  }, [points]);

  if (!data) {
    return (
      <div
        className={cn(
          'flex h-48 items-center justify-center rounded-lg border border-border bg-surface text-text-muted',
          className,
        )}
      >
        <AppText variant="bodySmall">No revenue data yet.</AppText>
      </div>
    );
  }

  const totalVolume = data.numeric.reduce((acc, p) => acc + p.volume, 0);
  const totalFee = data.numeric.reduce((acc, p) => acc + p.fee, 0);
  const totalCount = data.numeric.reduce((acc, p) => acc + p.count, 0);

  return (
    <div className={cn('rounded-lg border border-border bg-surface p-4', className)}>
      <div className="flex items-center justify-between">
        <AppText variant="bodyTitle" className="text-text-primary">
          Settlement volume
        </AppText>
        <AppText variant="bodySmall" className="text-text-muted">
          {formatKobo(totalVolume)} volume · {formatKobo(totalFee)} fees · {totalCount} settlements
        </AppText>
      </div>

      <div className="mt-4 flex h-40 items-end gap-1.5">
        {data.numeric.map((p) => {
          const hPct = (p.volume / data.max) * 100;
          const feePct = p.volume > 0 ? (p.fee / p.volume) * 100 : 0;
          return (
            <div
              key={p.bucket}
              className="group relative flex flex-1 flex-col justify-end"
              title={`${p.bucket}: ${formatKobo(p.volume)} volume · ${formatKobo(p.fee)} fees · ${p.count} settlements`}
            >
              <div className="w-full rounded-t-sm bg-secondary" style={{ height: `${hPct}%` }}>
                <div
                  className="w-full rounded-t-sm bg-primary"
                  style={{ height: `${feePct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex justify-between text-[10px] text-text-muted">
        <span>{formatBucket(data.numeric[0]?.bucket)}</span>
        <span>{formatBucket(data.numeric[data.numeric.length - 1]?.bucket)}</span>
      </div>
    </div>
  );
}

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatBucket(value: string | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-NG', { month: 'short', day: '2-digit' });
}
