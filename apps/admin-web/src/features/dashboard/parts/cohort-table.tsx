import { useMemo } from 'react';

import { AppText, cn } from '@ohlify/ui';
import type { AdminCohortWeeklyRow } from '@ohlify/api';

interface CohortTableProps {
  rows: ReadonlyArray<AdminCohortWeeklyRow> | undefined;
  className?: string;
}

interface PivotedRow {
  week: string;
  professionals: number;
  clients: number;
  total: number;
}

/**
 * Pivots the backend's "one row per (week, role)" shape into one row per
 * week with role columns. Cells use a weight-shaded background so peaks
 * pop out without a chart library.
 */
export function CohortTable({ rows, className }: CohortTableProps) {
  const pivoted = useMemo<PivotedRow[]>(() => {
    if (!rows || rows.length === 0) return [];
    const byWeek = new Map<string, PivotedRow>();
    for (const r of rows) {
      const wk = r.week_start;
      const cur = byWeek.get(wk) ?? { week: wk, professionals: 0, clients: 0, total: 0 };
      if (r.role === 'professional') cur.professionals += r.signups;
      else if (r.role === 'client') cur.clients += r.signups;
      cur.total += r.signups;
      byWeek.set(wk, cur);
    }
    return Array.from(byWeek.values()).sort((a, b) => (a.week < b.week ? -1 : 1));
  }, [rows]);

  if (pivoted.length === 0) {
    return (
      <div
        className={cn(
          'flex h-48 items-center justify-center rounded-lg border border-border bg-surface text-text-muted',
          className,
        )}
      >
        <AppText variant="bodySmall">No cohort data yet.</AppText>
      </div>
    );
  }

  const max = Math.max(1, ...pivoted.map((p) => p.total));

  return (
    <div className={cn('overflow-hidden rounded-lg border border-border bg-surface', className)}>
      <div className="border-b border-border px-4 py-3">
        <AppText variant="bodyTitle" className="text-text-primary">
          Weekly signups (last 12 weeks)
        </AppText>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-light text-[11px] uppercase tracking-wider text-text-muted">
            <th className="px-4 py-2 text-left">Week of</th>
            <th className="px-4 py-2 text-right">Pros</th>
            <th className="px-4 py-2 text-right">Clients</th>
            <th className="px-4 py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {pivoted.map((row) => (
            <tr key={row.week} className="border-b border-border/60 last:border-b-0">
              <td className="px-4 py-2 text-text-primary">{formatWeek(row.week)}</td>
              <td className="px-4 py-2 text-right tabular-nums">{row.professionals}</td>
              <td className="px-4 py-2 text-right tabular-nums">{row.clients}</td>
              <TotalCell n={row.total} max={max} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TotalCell({ n, max }: { n: number; max: number }) {
  const intensity = Math.min(0.7, n / max);
  return (
    <td
      className="px-4 py-2 text-right font-semibold tabular-nums text-text-primary"
      style={{ backgroundColor: `rgba(72, 110, 247, ${intensity})` }}
    >
      {n}
    </td>
  );
}

function formatWeek(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: '2-digit' });
}
