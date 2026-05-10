import { useMutation } from '@tanstack/react-query';
import { apiClient, EP, parseApiError } from '@ohlify/api';

export function useFpReset() {
  return useMutation({
    mutationFn: async (payload: { reset_token: string; new_password: string }) => {
      try {
        await apiClient.post(EP.AUTH_FP_RESET, { json: payload });
      } catch (err) {
        throw await parseApiError(err);
      }
    },
  });
}
