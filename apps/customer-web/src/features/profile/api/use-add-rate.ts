import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, EP, parseApiError } from '@ohlify/api';
import type { Rate } from '@ohlify/api';

export function useAddRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { call_type: 'audio' | 'video'; duration_minutes: number; price_kobo: number }) => {
      try {
        const res = await apiClient
          .post(EP.ME_RATES, { json: payload })
          .json<{ data: Rate }>();
        return res.data;
      } catch (err) {
        throw await parseApiError(err);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['me-rates'] });
      void queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });
      void queryClient.invalidateQueries({ queryKey: ['kyc-spec'] });
    },
  });
}
