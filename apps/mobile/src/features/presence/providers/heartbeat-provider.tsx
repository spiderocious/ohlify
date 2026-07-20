import { useEffect, useRef, type ReactNode } from 'react';

import { useAuthSession } from '@features/auth/providers/auth-session-provider';
import { useConfigBool, useConfigNumber } from '@shared/providers/app-config-provider';

import { presenceApi } from '../api/presence-api';

/**
 * Keeps a logged-in professional "online" for instant-call presence. Mirrors
 * mobile/lib/features/presence/providers/heartbeat_notifier.dart — same
 * gating (only runs while the session's role is professional), same
 * fire-and-forget ping (a dropped heartbeat just briefly looks offline, not
 * worth surfacing an error for).
 *
 * Two differences from Flutter, both intentional additions for this port:
 * 1. Gated on `presence.heartbeat_enabled` (public config) — the dead
 *    switch. When false, this never calls the heartbeat endpoint at all,
 *    for either mobile app.
 * 2. Interval is read from `presence.heartbeat_interval_seconds` (public
 *    config) instead of Flutter's hardcoded 30s constant.
 *
 * Mounted once at the app root (see app.provider.tsx) — not a screen-level
 * concern, matches Flutter's app_providers.dart eager `lazy: false`
 * registration.
 */
export function HeartbeatProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isProfessional } = useAuthSession();
  const heartbeatEnabled = useConfigBool('presence.heartbeat_enabled', true);
  const intervalSeconds = useConfigNumber('presence.heartbeat_interval_seconds', 30);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    const shouldRun = heartbeatEnabled && isAuthenticated && isProfessional;

    if (!shouldRun) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
      return;
    }

    function ping() {
      presenceApi.heartbeat().catch(() => {
        // Fire-and-forget — a dropped heartbeat just briefly looks offline.
      });
    }

    ping();
    intervalRef.current = setInterval(ping, intervalSeconds * 1000);

    return () => clearInterval(intervalRef.current);
  }, [heartbeatEnabled, isAuthenticated, isProfessional, intervalSeconds]);

  return <>{children}</>;
}
