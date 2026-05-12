import { useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient, EP } from '@ohlify/api';
import type { OnboardingStatusResponse } from '@ohlify/api';

const STATUS_KEY = ['onboarding-status'] as const;

/**
 * Shared hook for the KYC-rejected screens. Lives here (not in a global
 * shared/lib) because the rejection screen is the only consumer that
 * cares about the full payload — other callers usually invalidate via
 * the same key after a mutation.
 */
export function useOnboardingStatus() {
  return useQuery({
    queryKey: STATUS_KEY,
    queryFn: () =>
      apiClient
        .get(EP.ONBOARDING_STATUS)
        .json<{ data: OnboardingStatusResponse }>()
        .then((r) => r.data),
    staleTime: 30_000,
  });
}

export function useInvalidateOnboardingStatus() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: STATUS_KEY });
}
