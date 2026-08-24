import { ADMIN_EP, type AdminDashboard, type AdminDashboardRange } from '@ohlify/api';

import { useAdminQuery } from '../../../shared/api/use-admin-query.js';

/**
 * The whole business dashboard in one request.
 *
 * One composed read rather than one per section: the page draws every section
 * at once, so nine requests would only add nine chances for one to fail and
 * leave the board half-rendered — and sections fetched separately across a
 * bucket boundary would disagree with each other.
 *
 * `staleTime` is a minute. These are period aggregates, not live counters; a
 * refetch on every window focus would hammer twenty-eight aggregate queries to
 * redraw numbers that have not moved.
 */
export function useDashboard(range: AdminDashboardRange) {
  return useAdminQuery<AdminDashboard>({
    key: ['admin', 'dashboard', range],
    url: ADMIN_EP.DASHBOARD,
    searchParams: { range },
    staleTime: 60_000,
  });
}
