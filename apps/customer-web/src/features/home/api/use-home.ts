import { useQuery } from '@tanstack/react-query';
import { apiClient, EP } from '@ohlify/api';
import type { HomeResponse } from '@ohlify/api';

export function useHome() {
  return useQuery({
    queryKey: ['home'],
    queryFn: () =>
      apiClient
        .get(EP.HOME)
        .json<{ data: HomeResponse }>()
        .then((r) => r.data),
    staleTime: 60_000,
  });
}
