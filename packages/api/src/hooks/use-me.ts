import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client.js';
import { EP } from '../endpoints.js';
import type { MeResponse } from '../profile/types.js';

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () =>
      apiClient
        .get(EP.ME)
        .json<{ data: MeResponse }>()
        .then((r) => r.data),
  });
}
