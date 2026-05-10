import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, EP, parseApiError } from '@ohlify/api';
import type { ClientKycPayload, KycProgress } from '@ohlify/api';

export function useSaveClientKyc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ClientKycPayload) => {
      try {
        const res = await apiClient
          .patch(EP.ONBOARDING_KYC_CLIENT, { json: payload })
          .json<{ data: { kyc_progress: KycProgress } }>();
        return res.data;
      } catch (err) {
        throw await parseApiError(err);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });
    },
  });
}
