import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client.js';
import { EP } from '../endpoints.js';
import type { PublicConfig } from '../misc/types.js';

export function usePublicConfig() {
  return useQuery({
    queryKey: ['config-public'],
    queryFn: () =>
      apiClient
        .get(EP.CONFIG_PUBLIC)
        .json<{ data: PublicConfig }>()
        .then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
}
