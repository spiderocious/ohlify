import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@shared/api/api-client';
import { queryKeys } from '@shared/api/query-keys';

import { homeResponseFromJson, type HomeResponse } from '../types/home-models';

export const homeQueryKey = () => queryKeys.home();

/** Exported so the first-run prefetch warms this key with the same request the hook makes. */
export const fetchHome = (): Promise<HomeResponse> =>
  apiClient.get('home', {
    fromJson: (data) => homeResponseFromJson(data as Record<string, unknown>),
  }) as Promise<HomeResponse>;

export function useHome() {
  return useQuery({
    queryKey: homeQueryKey(),
    queryFn: fetchHome,
  });
}
