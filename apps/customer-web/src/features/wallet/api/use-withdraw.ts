import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, EP, parseApiError } from '@ohlify/api';
import type { WithdrawalResponse } from '@ohlify/api';
import { idempotencyKey } from '@ohlify/core';

export function useWithdraw() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { amount_kobo: number }) => {
      try {
        const res = await apiClient
          .post(EP.WALLET_WITHDRAW, {
            json: payload,
            headers: { 'Idempotency-Key': idempotencyKey() },
          })
          .json<{ data: WithdrawalResponse }>();
        return res.data;
      } catch (err) {
        throw await parseApiError(err);
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['wallet'] });
      void qc.invalidateQueries({ queryKey: ['wallet-transactions'] });
    },
  });
}
