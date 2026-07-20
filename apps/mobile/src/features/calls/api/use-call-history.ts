import { useInfiniteQuery } from '@tanstack/react-query';

import { callsApi } from './calls-api';

/** Mirrors mobile/lib/features/calls/providers/call_history_notifier.dart (backed by CacheKeys.callHistory). */
export const callHistoryQueryKey = () => ['calls-history'] as const;

export function useCallHistory() {
  return useInfiniteQuery({
    queryKey: callHistoryQueryKey(),
    queryFn: ({ pageParam }) => callsApi.getHistory({ cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : undefined),
    staleTime: 30_000,
  });
}
