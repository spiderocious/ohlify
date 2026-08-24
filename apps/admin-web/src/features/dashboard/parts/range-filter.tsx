import { HawkSegmentedControl, type HawkSegment } from '@ohlify/hawk-ui';

import { RANGE_SPECS, type DashboardRange } from './dashboard-range.js';

const SEGMENTS: ReadonlyArray<HawkSegment<DashboardRange>> = (
  Object.keys(RANGE_SPECS) as DashboardRange[]
).map((value) => ({ value, label: RANGE_SPECS[value].label }));

/**
 * The dashboard's date filter.
 *
 * One control for the whole page rather than a picker per panel: an operator
 * comparing revenue against call volume needs both on the same window, and
 * per-panel ranges make that comparison silently wrong.
 *
 * The attention band deliberately does not respond to it — see `AttentionBand`.
 */
export function RangeFilter({
  value,
  onChange,
}: {
  value: DashboardRange;
  onChange: (next: DashboardRange) => void;
}) {
  return (
    <HawkSegmentedControl
      segments={SEGMENTS}
      value={value}
      onChange={onChange}
      aria-label="Date range"
    />
  );
}
