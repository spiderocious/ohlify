import { useQuery } from '@tanstack/react-query';
import { apiClient, EP } from '@ohlify/api';
import type { LegalDocument } from '@ohlify/api';

export function useLegalDocument(kind: 'eula' | 'privacy' | 'terms') {
  const ep =
    kind === 'eula' ? EP.LEGAL_EULA : kind === 'privacy' ? EP.LEGAL_PRIVACY : EP.LEGAL_TERMS;
  return useQuery({
    queryKey: ['legal', kind],
    queryFn: () =>
      apiClient
        .get(ep)
        .json<{ data: LegalDocument }>()
        .then((r) => r.data),
    staleTime: 24 * 60 * 60 * 1000,
  });
}
