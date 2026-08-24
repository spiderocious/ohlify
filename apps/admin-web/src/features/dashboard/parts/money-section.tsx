import {
  HawkAdminPanel,
  HawkBalanceCheck,
  HawkCallout,
  HawkCaption,
  HawkDonutChart,
  HawkEmptyState,
  HawkKpiStrip,
  HawkLineChart,
  HawkSemantic,
  HawkText,
  formatKoboCompact,
} from '@ohlify/hawk-ui';
import type { AdminDashboard } from '@ohlify/api';

import { ChartSkeleton, DonutSkeleton, KpiStripSkeleton } from '../../../shared/parts/board-skeletons.js';
import { toComposition, toMoneyKpis, toRevenueSeries } from './dashboard-adapters.js';
import { RANGE_SPECS, type DashboardRange } from './dashboard-range.js';

/**
 * Money.
 *
 * `data.money` is null for roles that may not see it — the service omits the
 * block entirely rather than the client hiding it after arrival, so support
 * genuinely cannot read the figures out of the network tab. The screen already
 * declines to render this section for those roles; the null check here is the
 * belt to that braces.
 *
 * The KPI cells set `basis` on both revenue figures. Gross volume and net
 * revenue look identical in a cell, and an operator reading the wrong one
 * draws the wrong conclusion — which is the case `HawkKpi.basis` exists for.
 */
export function MoneySection({
  data,
  isLoading,
  range,
}: {
  data: AdminDashboard | undefined;
  isLoading: boolean;
  range: DashboardRange;
}) {
  const spec = RANGE_SPECS[range];
  const money = data?.money ?? null;

  return (
    <section aria-label="Money" className="flex flex-col gap-hawk-5">
      <HawkText variant="label" ink="strong" className="font-semibold">
        Money
      </HawkText>

      {isLoading || !data ? (
        <>
          <KpiStripSkeleton />
          <div className="grid gap-hawk-6 lg:grid-cols-3">
            <HawkAdminPanel title="Revenue" className="lg:col-span-2">
              <ChartSkeleton height={200} />
            </HawkAdminPanel>
            <HawkAdminPanel title="Composition">
              <DonutSkeleton />
            </HawkAdminPanel>
          </div>
        </>
      ) : money === null ? (
        <HawkCallout
          semantic={HawkSemantic.INFO}
          message="Money figures are limited to admin and finance roles."
        />
      ) : (
        <>
          <HawkKpiStrip items={toMoneyKpis(money, range)} />

          <div className="grid gap-hawk-6 lg:grid-cols-3">
            <HawkAdminPanel
              title="Revenue"
              className="lg:col-span-2"
              actions={<HawkCaption ink="muted">Net, per {data.granularity}</HawkCaption>}
            >
              <HawkLineChart
                data={toRevenueSeries(money, data.granularity)}
                height={200}
                semantic={HawkSemantic.SUCCESS}
                format={(v) => formatKoboCompact(v)}
              />
            </HawkAdminPanel>

            <HawkAdminPanel title="Composition">
              {/*
                A donut, not a stacked bar: the chart primitives render a single
                series, and faking a stack by layering two would misreport every
                value. Composition at one point in time is the honest thing one
                series can say.
              */}
              {toComposition(money).length === 0 ? (
                <HawkEmptyState
                  title="No revenue yet"
                  description="Nothing settled to the platform account in this period."
                />
              ) : (
                <div className="flex justify-center">
                  <HawkDonutChart
                    data={toComposition(money)}
                    size={128}
                    thickness={18}
                    format={(v) => formatKoboCompact(v)}
                  />
                </div>
              )}
            </HawkAdminPanel>
          </div>

          <HawkAdminPanel
            title="Ledger integrity"
            actions={<HawkCaption ink="muted">{spec.label}</HawkCaption>}
          >
            <div className="flex flex-col gap-hawk-4">
              <HawkBalanceCheck
                difference={money.ledger.difference_kobo}
                balanced={money.ledger.balanced}
              />
              <HawkCaption ink="muted">
                Every account balance summed. Double-entry makes this zero by construction — a
                non-zero difference means a journal posted wrong, and is always a bug.
              </HawkCaption>
            </div>
          </HawkAdminPanel>
        </>
      )}
    </section>
  );
}
