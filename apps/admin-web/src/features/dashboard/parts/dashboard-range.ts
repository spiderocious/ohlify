/**
 * The dashboard's time filter.
 *
 * One control drives every card on the page, so the range lives here rather
 * than in the screen — the API hooks will take it verbatim as
 * `?from=&to=&granularity=`, which is the shape `admin.metrics.service.ts`
 * already speaks (`RevenueQuery`).
 */

export const DashboardRange = {
  TODAY: 'today',
  WEEK: '7d',
  MONTH: '30d',
  QUARTER: '90d',
} as const;
export type DashboardRange = (typeof DashboardRange)[keyof typeof DashboardRange];

export interface RangeSpec {
  label: string;
  /** Days of lookback. 0 = since midnight today. */
  days: number;
  /** Bucket width the charts should ask the backend for. */
  granularity: 'hour' | 'day' | 'week';
  /** What the delta compares against, spelled out for the KPI badges. */
  comparison: string;
}

export const RANGE_SPECS: Readonly<Record<DashboardRange, RangeSpec>> = {
  [DashboardRange.TODAY]: {
    label: 'Today',
    days: 0,
    granularity: 'hour',
    comparison: 'vs yesterday',
  },
  [DashboardRange.WEEK]: {
    label: '7 days',
    days: 7,
    granularity: 'day',
    comparison: 'vs previous 7d',
  },
  [DashboardRange.MONTH]: {
    label: '30 days',
    days: 30,
    granularity: 'day',
    comparison: 'vs previous 30d',
  },
  [DashboardRange.QUARTER]: {
    label: '90 days',
    days: 90,
    granularity: 'week',
    comparison: 'vs previous 90d',
  },
};

/**
 * Buckets are server-time (UTC) — `date_trunc` in the metrics service runs
 * without a timezone argument. Lagos is UTC+1, so "today" here ends at 1am
 * local. That is a real trap for an operator reading a late-evening number,
 * and the header says so out loud rather than leaving them to discover it.
 */
export const RANGE_TIMEZONE_NOTE = 'All buckets UTC';
