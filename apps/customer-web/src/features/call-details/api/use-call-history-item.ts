import { useQuery } from '@tanstack/react-query';
import { apiClient, EP } from '@ohlify/api';
import type { CallHistoryItem } from '@ohlify/api';

export function useCallHistoryItem(id: string) {
  return useQuery({
    queryKey: ['call-history', id],
    queryFn: () =>
      apiClient
        .get(EP.CALL_HISTORY_ITEM(id))
        .json<{ data: CallHistoryItem }>()
        .then((r) => r.data),
    staleTime: 30_000,
    enabled: Boolean(id),
  });
}
