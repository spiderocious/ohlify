import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, EP, parseApiError } from '@ohlify/api';

export function useDeleteBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      try {
        await apiClient.delete(EP.ME_BANK_ACCOUNT);
      } catch (err) {
        throw await parseApiError(err);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['me-bank-account'] });
      void queryClient.invalidateQueries({ queryKey: ['kyc-spec'] });
    },
  });
}
