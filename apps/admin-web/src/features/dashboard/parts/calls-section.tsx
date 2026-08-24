import {
  HawkAdminPanel,
  HawkBarChart,
  HawkCaption,
  HawkDonutChart,
  HawkEmptyState,
  HawkKpiStrip,
  HawkProgressBar,
  HawkSemantic,
  HawkText,
  type HawkChartPoint,
} from '@ohlify/hawk-ui';
import type { AdminDashboard } from '@ohlify/api';

import {
  ChartSkeleton,
  DonutSkeleton,
  KpiStripSkeleton,
  RowsSkeleton,
} from '../../../shared/parts/board-skeletons.js';
import {
  toCallKpis,
  toCallOutcomes,
  toCallQualityKpis,
  toEndReasons,
  toFunnel,
} from './dashboard-adapters.js';
import { type DashboardRange } from './dashboard-range.js';

/**
 * Calls — the core product.
 *
 * Instant and scheduled calls are two systems with two different status enums
 * (`instant_call_status` vs `call_status`). They are reported separately,
 * because summing them produces a number that means nothing: a "missed"
 * instant call is a professional who did not pick up within the ring window,
 * and a scheduled call that failed is a no-show attributed to a specific side.
 */
export function CallsSection({
  data,
  isLoading,
  range,
}: {
  data: AdminDashboard | undefined;
  isLoading: boolean;
  range: DashboardRange;
}) {
  const loading = isLoading || !data;

  return (
    <section aria-label="Calls" className="flex flex-col gap-hawk-5">
      <HawkText variant="label" ink="strong" className="font-semibold">
        Calls
      </HawkText>

      {/*
        The same KPI cards the money band uses. An operator scanning this page
        should not have to re-learn how to read a figure between sections —
        label, value, delta and sparkline in one shape, everywhere.
      */}
      {loading ? <KpiStripSkeleton /> : <HawkKpiStrip items={toCallKpis(data, range)} />}

      <div className="grid gap-hawk-6 lg:grid-cols-3">
        <HawkAdminPanel
          title="Scheduled call funnel"
          className="lg:col-span-2"
          actions={<HawkCaption ink="muted">scheduled → completed</HawkCaption>}
        >
          {loading ? <RowsSkeleton rows={4} /> : <ScheduledFunnel steps={toFunnel(data)} />}
        </HawkAdminPanel>

        <HawkAdminPanel title="Outcomes">
          {loading ? (
            <DonutSkeleton />
          ) : toCallOutcomes(data).length === 0 ? (
            <HawkEmptyState title="No calls" description="Nothing in this period." />
          ) : (
            <div className="flex justify-center">
              <HawkDonutChart data={toCallOutcomes(data)} size={128} thickness={18} />
            </div>
          )}
        </HawkAdminPanel>
      </div>

      <div className="flex flex-col gap-hawk-4">
        <div className="flex flex-wrap items-baseline gap-hawk-4">
          <HawkText variant="label" ink="strong" className="font-semibold">
            Call quality
          </HawkText>
          <HawkCaption ink="muted">from client telemetry · call_session_events</HawkCaption>
        </div>
        {loading ? <KpiStripSkeleton /> : <HawkKpiStrip items={toCallQualityKpis(data)} />}
        <HawkCaption ink="muted" className="leading-snug">
          Permission-blocked is the one worth watching — nothing else in the stack reports a user
          who could not grant mic access, and a rising count is a broken onboarding rather than a
          call problem.
        </HawkCaption>
      </div>

      <HawkAdminPanel
        title="How calls end"
        actions={<HawkCaption ink="muted">ca:ended · payload.reason</HawkCaption>}
      >
        {loading ? (
          <ChartSkeleton height={150} />
        ) : toEndReasons(data).length === 0 ? (
          <HawkEmptyState
            title="No end events"
            description="No client reported a call ending in this period."
          />
        ) : (
          <HawkBarChart
            data={toEndReasons(data)}
            horizontal
            height={150}
            semantic={HawkSemantic.INFO}
          />
        )}
      </HawkAdminPanel>
    </section>
  );
}

/**
 * The funnel, drawn as proportion bars rather than a bar chart.
 *
 * What matters is the drop between adjacent steps, not the absolute heights —
 * a bar chart of 640/592/548/517 looks like four near-identical bars and hides
 * the finding entirely. Each row states its own share of the first step, and
 * the loss against the step before it.
 */
function ScheduledFunnel({ steps }: { steps: readonly HawkChartPoint[] }) {
  const top = steps[0]?.value ?? 0;

  if (top === 0) {
    return (
      <HawkEmptyState title="No scheduled calls" description="Nothing was booked in this period." />
    );
  }

  return (
    <div className="flex flex-col gap-hawk-5">
      {steps.map((step, i) => {
        const previous = i === 0 ? undefined : steps[i - 1]?.value;
        const lost = previous === undefined ? 0 : previous - step.value;
        const share = step.value / top;

        return (
          <div key={step.label} className="flex flex-col gap-hawk-2">
            <div className="flex items-baseline justify-between gap-hawk-4">
              <HawkText variant="label">{step.label}</HawkText>
              <span className="flex items-baseline gap-hawk-3">
                <HawkText variant="label" ink="strong" record>
                  {step.value.toLocaleString()}
                </HawkText>
                <HawkCaption ink="muted" className="hawk-record">
                  {(share * 100).toFixed(0)}%
                </HawkCaption>
              </span>
            </div>
            <HawkProgressBar
              value={share}
              height={6}
              semantic={i === steps.length - 1 ? HawkSemantic.SUCCESS : HawkSemantic.INFO}
            />
            {lost > 0 && (
              <HawkCaption ink="muted" className="hawk-record">
                −{lost.toLocaleString()} lost from {steps[i - 1]?.label.toLowerCase()}
              </HawkCaption>
            )}
          </div>
        );
      })}
    </div>
  );
}
