import { useQuery } from '@tanstack/react-query';
import { apiClient, EP } from '@ohlify/api';
import type { ProfessionalDetail } from '@ohlify/api';

export function useProfessional(id: string) {
  return useQuery({
    queryKey: ['professional', id],
    queryFn: () =>
      apiClient
        .get(EP.PROFESSIONAL(id))
        .json<{ data: ProfessionalDetail }>()
        .then((r) => r.data),
    staleTime: 60_000,
    enabled: Boolean(id),
  });
}
