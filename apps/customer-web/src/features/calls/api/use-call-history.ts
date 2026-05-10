import { useQuery } from '@tanstack/react-query';
import { apiClient, EP } from '@ohlify/api';
import type { CallHistoryPage } from '@ohlify/api';

export function useCallHistory() {
  return useQuery({
    queryKey: ['call-history'],
    queryFn: () => apiClient.get(EP.CALL_HISTORY).json<CallHistoryPage>(),
    staleTime: 30_000,
  });
}
