import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, EP, parseApiError } from '@ohlify/api';
import type { ProfessionalKycPayload, KycProgress } from '@ohlify/api';

export function useSaveProfessionalKyc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ProfessionalKycPayload) => {
      try {
        const res = await apiClient
          .patch(EP.ONBOARDING_KYC_PROFESSIONAL, { json: payload })
          .json<{ data: { kyc_progress: KycProgress } }>();
        return res.data;
      } catch (err) {
        throw await parseApiError(err);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });
      void queryClient.invalidateQueries({ queryKey: ['kyc-spec'] });
    },
  });
}
