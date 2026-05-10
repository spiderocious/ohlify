import { useQuery } from '@tanstack/react-query';
import { apiClient, EP } from '@ohlify/api';
import type { Bank } from '@ohlify/api';

export function useBanks() {
  return useQuery({
    queryKey: ['banks'],
    queryFn: () =>
      apiClient
        .get(EP.BANKS)
        .json<{ data: Bank[] }>()
        .then((r) => r.data),
    staleTime: 24 * 60 * 60 * 1000,
  });
}
