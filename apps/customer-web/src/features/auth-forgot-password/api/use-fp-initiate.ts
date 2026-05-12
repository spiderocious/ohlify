import { useMutation } from '@tanstack/react-query';
import { apiClient, EP, parseApiError } from '@ohlify/api';

export function useFpInitiate() {
  return useMutation({
    mutationFn: async (payload: { email: string }) => {
      try {
        await apiClient.post(EP.AUTH_FP_INITIATE, { json: payload });
      } catch (err) {
        throw await parseApiError(err);
      }
    },
  });
}
