import { useQuery } from '@tanstack/react-query';
import { apiClient, EP } from '@ohlify/api';
import type { ApiRate } from '@ohlify/api';

export function useProfessionalRates(id: string) {
  return useQuery({
    queryKey: ['professional-rates', id],
    queryFn: () =>
      apiClient
        .get(EP.PROFESSIONAL_RATES(id))
        .json<{ data: ApiRate[] }>()
        .then((r) => r.data),
    staleTime: 60_000,
    enabled: Boolean(id),
  });
}
