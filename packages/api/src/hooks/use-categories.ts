import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client.js';
import { EP } from '../endpoints.js';
import type { Category } from '../discovery/types.js';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () =>
      apiClient
        .get(EP.CATEGORIES)
        .json<{ data: Category[] }>()
        .then((r) => r.data),
    staleTime: 24 * 60 * 60 * 1000,
  });
}
