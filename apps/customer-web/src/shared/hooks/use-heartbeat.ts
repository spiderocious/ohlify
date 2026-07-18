import { useEffect } from 'react';
import { apiClient, EP } from '@ohlify/api';
import { useMe } from '@ohlify/api';

const HEARTBEAT_INTERVAL_MS = 30_000;

/** Keeps a logged-in professional marked "online" by pinging the presence
 *  heartbeat on an interval. No-op for clients. Mounted once in the shell. */
export function useHeartbeat() {
  const { data: me } = useMe();
  const isPro = me?.role === 'professional';

  useEffect(() => {
    if (!isPro) return;

    const ping = () => {
      void apiClient
        .post(EP.ME_PRESENCE_HEARTBEAT)
        .json()
        .catch(() => {
          // Non-fatal: a dropped heartbeat just means we briefly look offline.
        });
    };

    ping();
    const timer = setInterval(ping, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isPro]);
}
