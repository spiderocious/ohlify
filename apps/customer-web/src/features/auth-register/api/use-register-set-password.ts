import { useMutation } from '@tanstack/react-query';
import { apiClient, EP, parseApiError } from '@ohlify/api';

export function useRegisterSetPassword() {
  return useMutation({
    mutationFn: async (payload: { registration_token: string; password: string }) => {
      try {
        await apiClient.post(EP.AUTH_REGISTER_SET_PASSWORD, { json: payload });
      } catch (err) {
        throw await parseApiError(err);
      }
    },
  });
}
