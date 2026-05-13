import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { PREFETCH_ENABLED } from './config.js';
import { canPrefetch, onIdle } from './guards.js';
import { lookupPlan } from './route-graph.js';

/**
 * Mounted once inside the authed shell. On every route change, consults the
 * `ROUTE_GRAPH`, then fires the plan's chunk + data tasks during the next
 * idle slot. No-op when `VITE_ENABLE_PREFETCH !== '1'`.
 *
 * The watcher renders nothing.
 */
export function RoutePrefetchWatcher() {
  const location = useLocation();
  const qc = useQueryClient();

  useEffect(() => {
    if (!PREFETCH_ENABLED) return;
    const match = lookupPlan(location.pathname);
    if (!match) return;
    const { plan, params } = match;

    const cancelIdle = onIdle(() => {
      if (!canPrefetch()) return;
      plan.chunks?.forEach((load) => {
        // Fire-and-forget; failures are silent (best-effort).
        void load().catch(() => undefined);
      });
      plan.data?.forEach((task) => {
        if (task.when && !task.when({ qc, params })) return;
        void task.run({ qc, params });
      });
    });

    return cancelIdle;
  }, [location.pathname, qc]);

  return null;
}
