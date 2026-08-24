import {
  HawkAdminPanel,
  HawkBarChart,
  HawkCaption,
  HawkKeyValue,
  HawkKpiStrip,
  HawkSemantic,
  HawkStatCompact,
  HawkStepperVertical,
  HawkText,
} from '@ohlify/hawk-ui';
import type { AdminDashboard } from '@ohlify/api';

import {
  ChartSkeleton,
  KpiStripSkeleton,
  RowsSkeleton,
} from '../../../shared/parts/board-skeletons.js';
import {
  toActivationFunnel,
  toActivationKpis,
  toSignupsClients,
  toSignupsProfessionals,
} from './dashboard-adapters.js';
import { type DashboardRange } from './dashboard-range.js';

/**
 * Growth and engagement.
 *
 * Clients and professionals are charted separately rather than stacked. Two
 * reasons, and neither is a limitation: the chart primitives render one series
 * (a faked stack would misreport values), and more importantly a marketplace's
 * two sides are different businesses. Client growth with flat professional
 * growth is a supply crisis dressed up as a good week, and one stacked bar
 * would hide exactly that.
 */
export function GrowthSection({
  data,
  isLoading,
  range,
}: {
  data: AdminDashboard | undefined;
  isLoading: boolean;
  range: DashboardRange;
}) {
  const loading = isLoading || !data;

  const clients = loading ? [] : toSignupsClients(data, data.granularity);
  const professionals = loading ? [] : toSignupsProfessionals(data, data.granularity);
  const clientTotal = clients.reduce((sum, point) => sum + point.value, 0);
  const proTotal = professionals.reduce((sum, point) => sum + point.value, 0);

  return (
    <section aria-label="Growth" className="flex flex-col gap-hawk-5">
      <HawkText variant="label" ink="strong" className="font-semibold">
        Growth
      </HawkText>

      <div className="grid gap-hawk-6 lg:grid-cols-2">
        <HawkAdminPanel
          title="New clients"
          actions={
            !loading && (
              <HawkCaption ink="muted" className="hawk-record">
                {clientTotal.toLocaleString()} total
              </HawkCaption>
            )
          }
        >
          {loading ? (
            <ChartSkeleton height={160} />
          ) : (
            <HawkBarChart data={clients} height={160} semantic={HawkSemantic.INFO} />
          )}
        </HawkAdminPanel>

        <HawkAdminPanel
          title="New professionals"
          actions={
            !loading && (
              <HawkCaption ink="muted" className="hawk-record">
                {proTotal.toLocaleString()} total
              </HawkCaption>
            )
          }
        >
          {loading ? (
            <ChartSkeleton height={160} />
          ) : (
            <HawkBarChart data={professionals} height={160} semantic={HawkSemantic.SUCCESS} />
          )}
        </HawkAdminPanel>
      </div>

      {/* Same cards as money and calls — one shape for a figure, everywhere. */}
      <div className="flex flex-col gap-hawk-4">
        <div className="flex flex-wrap items-baseline gap-hawk-4">
          <HawkText variant="label" ink="strong" className="font-semibold">
            Activation
          </HawkText>
          <HawkCaption ink="muted">every stage is a timestamp column on users</HawkCaption>
        </div>
        {loading ? <KpiStripSkeleton /> : <HawkKpiStrip items={toActivationKpis(data, range)} />}
      </div>

      <div className="grid gap-hawk-6 lg:grid-cols-3">
        <HawkAdminPanel title="Activation funnel" className="lg:col-span-2">
          {loading ? (
            <RowsSkeleton rows={6} />
          ) : (
            <div className="flex flex-col gap-hawk-5">
              <HawkStepperVertical steps={toActivationFunnel(data)} current={6} />
              <HawkCaption ink="muted" className="leading-snug">
                Where onboarding leaks, stage by stage. The gap worth acting on is the last
                one — professionals who cleared KYC and never took a call are supply already
                paid for.
              </HawkCaption>
            </div>
          )}
        </HawkAdminPanel>

        <div className="flex flex-col gap-hawk-6">
          <HawkAdminPanel title="Supply health">
            {loading ? (
              <RowsSkeleton rows={4} />
            ) : (
              <div className="flex flex-col gap-hawk-4">
                <HawkStatCompact
                  label="Bookable now"
                  value={data.growth.supply.bookable.toLocaleString()}
                />
                <HawkKeyValue label="KYC approved" value={data.growth.supply.approved} record />
                <HawkKeyValue
                  label="Available now"
                  value={data.growth.supply.available_now}
                  record
                />
                <HawkKeyValue
                  label="No rate set"
                  value={data.growth.supply.missing_rates}
                  record
                />
                <HawkCaption ink="muted" className="leading-snug">
                  Bookable means approved, available, and carrying at least one rate. A
                  professional with no rate never appears in search — they are invisible supply.
                </HawkCaption>
              </div>
            )}
          </HawkAdminPanel>

          <HawkAdminPanel title="Engagement">
            {loading ? (
              <RowsSkeleton rows={5} />
            ) : (
              <div className="flex flex-col gap-hawk-4">
                <HawkKeyValue
                  label="Daily active"
                  value={data.growth.engagement.dau.toLocaleString()}
                  record
                />
                <HawkKeyValue
                  label="Weekly active"
                  value={data.growth.engagement.wau.toLocaleString()}
                  record
                />
                <HawkKeyValue
                  label="Monthly active"
                  value={data.growth.engagement.mau.toLocaleString()}
                  record
                />
                <HawkKeyValue
                  label="Messages sent"
                  value={data.growth.engagement.messages.toLocaleString()}
                  record
                />
                <HawkKeyValue
                  label="Schedules accepted"
                  value={`${data.growth.engagement.schedules_accepted} / ${
                    data.growth.engagement.schedules_accepted +
                    data.growth.engagement.schedules_declined
                  }`}
                  record
                />
              </div>
            )}
          </HawkAdminPanel>
        </div>
      </div>
    </section>
  );
}
