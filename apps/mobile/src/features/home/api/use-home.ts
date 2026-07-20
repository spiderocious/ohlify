import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@shared/api/api-client';

import { homeResponseFromJson, type HomeResponse } from '../types/home-models';

/** Mirrors mobile/lib/features/home/providers/home_notifier.dart (staleTime: 60s). */
export const homeQueryKey = () => ['home'] as const;

export function useHome() {
  return useQuery({
    queryKey: homeQueryKey(),
    queryFn: () =>
      apiClient.get('home', {
        fromJson: (data) => homeResponseFromJson(data as Record<string, unknown>),
      }) as Promise<HomeResponse>,
    staleTime: 60_000,
  });
}
