import {
  IconAlertTriangle,
  IconCalendar,
  IconCreditCard,
  IconIdCard,
  IconPhone,
  IconUsers,
} from '@icons';
import { AdminRole, RevenueGranularity } from '@ohlify/api';

import { useCurrentAdmin } from '../../../shared/auth/use-current-admin.js';
import { PageHeader } from '../../../shared/parts/page-header.js';
import { QueryView } from '../../../shared/parts/empty-or-error.js';
import { useMetricsCohorts, useMetricsOverview, useMetricsRevenue } from '../api/use-metrics.js';
import { CohortTable } from '../parts/cohort-table.js';
import { KpiCard } from '../parts/kpi-card.js';
import { RevenueChart } from '../parts/revenue-chart.js';

const fmt = (n: number | undefined): string => (n ?? 0).toLocaleString();

export function DashboardScreen() {
  const admin = useCurrentAdmin();
  // Revenue is FINANCE-only (admin | finance_ops). The dashboard is reachable by
  // support too, so only fetch/show revenue when the role allows it — otherwise
  // the panel just 403s. (BUGS.md B12.)
  const canViewRevenue = admin?.role === AdminRole.ADMIN || admin?.role === AdminRole.FINANCE_OPS;

  const overview = useMetricsOverview();
  const revenue = useMetricsRevenue({
    granularity: RevenueGranularity.DAY,
    enabled: canViewRevenue,
  });
  const cohorts = useMetricsCohorts();

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Live snapshot of users, calls, and queues." />

      <div className="px-6 py-6">
        <QueryView isLoading={overview.isLoading} error={overview.error}>
          {overview.data && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label="Total users"
                value={fmt(overview.data.users?.total)}
                hint={`${fmt(overview.data.users?.active)} active`}
                Icon={IconUsers}
              />
              <KpiCard
                label="Professionals"
                value={fmt(overview.data.users?.by_role?.professionals)}
                hint={`${fmt(overview.data.users?.by_role?.clients)} clients`}
                Icon={IconUsers}
                tone="success"
              />
              <KpiCard
                label="Calls in flight"
                value={fmt(
                  (overview.data.calls?.scheduled ?? 0) + (overview.data.calls?.in_progress ?? 0),
                )}
                hint={`${fmt(overview.data.calls?.in_progress)} in progress`}
                Icon={IconPhone}
              />
              <KpiCard
                label="Calls today"
                value={fmt(overview.data.calls?.completed_today)}
                hint={`${fmt(overview.data.calls?.completed_30d)} in 30d`}
                Icon={IconCalendar}
              />
              <KpiCard
                label="Pending KYC"
                value={fmt(overview.data.queues?.pending_kyc)}
                hint="Awaiting review"
                Icon={IconIdCard}
                tone={(overview.data.queues?.pending_kyc ?? 0) > 0 ? 'warning' : 'default'}
              />
              <KpiCard
                label="Pending refunds"
                value={fmt(overview.data.queues?.pending_refunds)}
                hint="Awaiting decision"
                Icon={IconCreditCard}
                tone={(overview.data.queues?.pending_refunds ?? 0) > 0 ? 'warning' : 'default'}
              />
              <KpiCard
                label="Pending withdrawals"
                value={fmt(overview.data.queues?.pending_withdrawals)}
                hint="Awaiting payout"
                Icon={IconCreditCard}
                tone={(overview.data.queues?.pending_withdrawals ?? 0) > 0 ? 'warning' : 'default'}
              />
              <KpiCard
                label="Suspended / blocked"
                value={fmt(
                  (overview.data.users?.suspended ?? 0) + (overview.data.users?.blocked ?? 0),
                )}
                hint={`${fmt(overview.data.users?.blocked)} blocked`}
                Icon={IconAlertTriangle}
                tone={
                  (overview.data.users?.suspended ?? 0) + (overview.data.users?.blocked ?? 0) > 0
                    ? 'warning'
                    : 'default'
                }
              />
            </div>
          )}
        </QueryView>

        <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
          {canViewRevenue ? (
            <QueryView isLoading={revenue.isLoading} error={revenue.error}>
              <RevenueChart points={revenue.data?.series} />
            </QueryView>
          ) : (
            <div className="flex items-center justify-center rounded-xl border border-dashed border-border p-8 text-sm text-text-muted">
              Revenue is available to finance and admin roles.
            </div>
          )}
          <QueryView isLoading={cohorts.isLoading} error={cohorts.error}>
            <CohortTable rows={cohorts.data?.weekly_signups} />
          </QueryView>
        </div>
      </div>
    </>
  );
}
