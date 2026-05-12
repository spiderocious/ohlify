import { useQuery } from '@tanstack/react-query';

import { apiClient, EP } from '@ohlify/api';
import type { KycSpecResponse } from '@ohlify/api';

/**
 * Fetches the KYC item spec for the current user — what to render, current
 * values, and per-item completeness. Single source of truth for the KYC
 * screen.
 *
 * Always-fresh (`staleTime: 0`) so any save mutation that invalidates
 * `['kyc-spec']` immediately repaints the tile state.
 */
export function useKycSpec() {
  return useQuery({
    queryKey: ['kyc-spec'],
    queryFn: () =>
      apiClient
        .get(EP.ONBOARDING_KYC_SPEC)
        .json<{ data: KycSpecResponse }>()
        .then((r) => r.data),
    staleTime: 0,
  });
}
