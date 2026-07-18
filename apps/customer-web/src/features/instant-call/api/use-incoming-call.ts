import { useQuery } from '@tanstack/react-query';
import { apiClient, EP } from '@ohlify/api';
import type { IncomingInstantCall } from '@ohlify/api';

/** Polls for a ringing instant call while the app is open (foreground). Native
 *  killed-app ringing is Phase 7. */
export function useIncomingCall(enabled = true) {
  return useQuery({
    queryKey: ['incoming-instant-call'],
    enabled,
    refetchInterval: 5_000,
    queryFn: () =>
      apiClient
        .get(EP.INSTANT_CALL_INCOMING)
        .json<{ data: IncomingInstantCall | null }>()
        .then((r) => r.data),
  });
}
