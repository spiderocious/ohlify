import {
  ADMIN_EP,
  type AdminDashboardRange,
  type AdminTechnicalDashboard,
} from '@ohlify/api';

import { useAdminQuery } from '../../../shared/api/use-admin-query.js';

/** How often the board refetches while live. */
export const TECHNICAL_REFRESH_MS = 30_000;

/**
 * The technical board in one request.
 *
 * Opposite caching posture to the business dashboard: **no `staleTime`, and a
 * polling interval while live.** Queue depth and pool saturation at 09:04 are
 * worthless at 09:05, so a cached read here would actively mislead — whereas
 * caching a seven-day revenue total for a minute costs nothing.
 *
 * Polling stops when `live` is false so a paused board is genuinely paused,
 * not merely relabelled.
 */
export function useTechnical(range: AdminDashboardRange, live: boolean) {
  return useAdminQuery<AdminTechnicalDashboard>(
    {
      key: ['admin', 'technical', range],
      url: ADMIN_EP.DASHBOARD_TECHNICAL,
      searchParams: { range },
    },
    {
      refetchInterval: live ? TECHNICAL_REFRESH_MS : false,
      // Keep polling when the tab is backgrounded: an operator watching a
      // draining queue on a second monitor should not find it frozen.
      refetchIntervalInBackground: live,
    },
  );
}
