import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, EP, parseApiError } from '@ohlify/api';
import type { BuyMinutesPayload, BuyMinutesResult } from '@ohlify/api';

import { minutesBalanceQueryKey } from './use-minutes-balance.js';

/** Buy minutes against a professional, funded from the wallet. */
export function useBuyMinutes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: BuyMinutesPayload) => {
      try {
        const res = await apiClient
          .post(EP.ME_MINUTES, { json: payload })
          .json<{ data: BuyMinutesResult }>();
        return res.data;
      } catch (err) {
        throw await parseApiError(err);
      }
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: minutesBalanceQueryKey(data.professional_id, data.call_type),
      });
      void queryClient.invalidateQueries({ queryKey: ['minutes-balances'] });
      // Wallet balance dropped — refresh wallet views.
      void queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}
