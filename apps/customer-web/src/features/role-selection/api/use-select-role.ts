import { useMutation } from '@tanstack/react-query';
import { apiClient, EP, parseApiError } from '@ohlify/api';
import type { OnboardingStep } from '@ohlify/api';

export function useSelectRole() {
  return useMutation({
    mutationFn: async (payload: { role: 'client' | 'professional' }) => {
      try {
        const res = await apiClient
          .post(EP.ONBOARDING_ROLE, { json: payload })
          .json<{ data: { role: string; next_step: OnboardingStep } }>();
        return res.data;
      } catch (err) {
        throw await parseApiError(err);
      }
    },
  });
}
