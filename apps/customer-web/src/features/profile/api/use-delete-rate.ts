import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, EP, parseApiError } from '@ohlify/api';

export function useDeleteRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await apiClient.delete(EP.ME_RATE(id));
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
