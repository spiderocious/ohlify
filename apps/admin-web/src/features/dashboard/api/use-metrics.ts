import {
  ADMIN_EP,
  type AdminMetricsCohorts,
  type AdminMetricsOverview,
  type AdminMetricsRevenue,
  type RevenueGranularity,
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
  /**
   * Revenue is a FINANCE-only endpoint (admin | finance_ops). The dashboard is
   * reachable by `support` too, so the caller must gate this query on role —
   * otherwise a support admin's dashboard fires a request that always 403s.
   * (BUGS.md B12.)
   */
  enabled?: boolean;
}

export function useMetricsRevenue(args: RevenueQueryArgs = {}) {
  const { granularity, from, to, enabled } = args;
  return useAdminQuery<AdminMetricsRevenue>({
    key: ['admin', 'metrics', 'revenue', { granularity, from, to }],
    url: ADMIN_EP.METRICS_REVENUE,
    searchParams: { granularity, from, to },
    enabled: enabled ?? true,
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
