import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, EP, parseApiError } from '@ohlify/api';
import type { BankAccount } from '@ohlify/api';

export function useSaveBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { account_number: string; bank_code: string }) => {
      try {
        const res = await apiClient
          .put(EP.ME_BANK_ACCOUNT, { json: payload })
          .json<{ data: BankAccount }>();
        return res.data;
      } catch (err) {
        throw await parseApiError(err);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['me-bank-account'] });
      void queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });
      void queryClient.invalidateQueries({ queryKey: ['kyc-spec'] });
    },
  });
}
