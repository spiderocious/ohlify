import { useQuery } from '@tanstack/react-query';
import { apiClient, EP } from '@ohlify/api';
import type { Presence } from '@ohlify/api';

export const presenceQueryKey = (proId: string) => ['presence', proId] as const;

/** Live reachability of a professional. Polled so the "available now" badge and
 *  the Call preflight stay fresh. */
export function usePresence(proId: string, enabled = true) {
  return useQuery({
    queryKey: presenceQueryKey(proId),
    enabled: enabled && Boolean(proId),
    refetchInterval: 20_000,
    queryFn: () =>
      apiClient
        .get(EP.PROFESSIONAL_PRESENCE(proId))
        .json<{ data: Presence }>()
        .then((r) => r.data),
  });
}
