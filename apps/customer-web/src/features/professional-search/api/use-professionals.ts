import { useQuery } from '@tanstack/react-query';
import { apiClient, EP } from '@ohlify/api';
import type { ProfessionalsPage } from '@ohlify/api';

interface ProfessionalsParams {
  q?: string;
  category?: string;
  sort?: 'rating' | 'price' | 'name';
  direction?: 'asc' | 'desc';
  cursor?: string;
  limit?: number;
}

export function useProfessionals(params: ProfessionalsParams) {
  const searchParams: Record<string, string> = {};
  if (params.q) searchParams['q'] = params.q;
  if (params.category) searchParams['category'] = params.category;
  if (params.sort) searchParams['sort'] = params.sort;
  if (params.direction) searchParams['direction'] = params.direction;
  if (params.cursor) searchParams['cursor'] = params.cursor;
  if (params.limit !== undefined) searchParams['limit'] = String(params.limit);

  return useQuery({
    queryKey: ['professionals', params],
    queryFn: () =>
      apiClient
        .get(EP.PROFESSIONALS, { searchParams })
        .json<ProfessionalsPage>(),
    staleTime: 30_000,
  });
}
