import { useQuery } from '@tanstack/react-query';
import { apiClient, EP } from '@ohlify/api';
import type { Rate } from '@ohlify/api';

export function useMyRates() {
  return useQuery({
    queryKey: ['me-rates'],
    queryFn: () =>
      apiClient
        .get(EP.ME_RATES)
        .json<{ data: Rate[] }>()
        .then((r) => r.data),
  });
}
