import { useQuery } from '@tanstack/react-query';
import { apiClient, EP } from '@ohlify/api';
import type { JoinableCall } from '@ohlify/api';

/**
 * Polls `/calls/joinable` every 15s. Drives the sticky "Join now" banner
 * on the tabbed shell so a user who's web-only (or whose mobile push
 * didn't fire) still gets pulled into the call.
 *
 * 15s is the floor — anything more often is noisy and Agora's webhook
 * + the call-starter cron run on 30s intervals, so polling faster
 * doesn't actually surface state any sooner.
 */
export function useJoinableCalls() {
  return useQuery({
    queryKey: ['calls', 'joinable'],
    queryFn: () =>
      apiClient
        .get(EP.CALLS_JOINABLE)
        .json<{ data: JoinableCall[] }>()
        .then((r) => r.data),
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    staleTime: 10_000,
  });
}
