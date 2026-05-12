import {
  ADMIN_EP,
  RevenueGranularity,
  type AdminMetricsCohorts,
  type AdminMetricsOverview,
  type AdminMetricsRevenue,
} from '@ohlify/api';

import { useAdminQuery } from '../../../shared/api/use-admin-query.js';

export function useMetricsOverview() {
  return useAdminQuery<AdminMetricsOverview>({
    key: ['admin', 'metrics', 'overview'],
    url: ADMIN_EP.METRICS_OVERVIEW,
    staleTime: 60_000,
  });
}

interface RevenueQueryArgs {
  granularity?: RevenueGranularity;
  from?: string;
  to?: string;
}

export function useMetricsRevenue(args: RevenueQueryArgs = {}) {
  return useAdminQuery<AdminMetricsRevenue>({
    key: ['admin', 'metrics', 'revenue', args],
    url: ADMIN_EP.METRICS_REVENUE,
    searchParams: { granularity: args.granularity, from: args.from, to: args.to },
    staleTime: 60_000,
  });
}

export function useMetricsCohorts() {
  return useAdminQuery<AdminMetricsCohorts>({
    key: ['admin', 'metrics', 'cohorts'],
    url: ADMIN_EP.METRICS_COHORTS,
    staleTime: 5 * 60_000,
  });
}
