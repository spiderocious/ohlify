import { useQuery } from '@tanstack/react-query';
import { apiClient, EP } from '@ohlify/api';
import type { HandleCheckResponse } from '@ohlify/api';

/**
 * Real-time handle availability check. Hit `/onboarding/handle/check` with
 * `?handle=...`. The backend always returns 200 — branch on `available`.
 *
 * Caller is responsible for debouncing the input. We only fire a network
 * request once `handle.length >= 1`; sub-3-char inputs come back as
 * `available: false, reason: 'invalid_format'` from the server, which lets
 * the UI surface a consistent message without a separate client-side rule.
 */
export function useCheckHandle(handle: string) {
  return useQuery<HandleCheckResponse>({
    queryKey: ['handle-check', handle],
    queryFn: async () => {
      const res = await apiClient
        .get(EP.ONBOARDING_HANDLE_CHECK, { searchParams: { handle } })
        .json<{ data: HandleCheckResponse }>();
      return res.data;
    },
    enabled: handle.length >= 1,
    staleTime: 60_000,
    retry: false,
  });
}
