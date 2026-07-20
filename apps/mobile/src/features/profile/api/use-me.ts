import { useQuery } from '@tanstack/react-query';

import { profileApi } from './profile-api';

/** Mirrors mobile/lib/features/profile/providers/me_notifier.dart. */
export const meQueryKey = () => ['me'] as const;

export function useMe() {
  return useQuery({
    queryKey: meQueryKey(),
    queryFn: () => profileApi.getMe(),
    staleTime: 30_000,
  });
}
