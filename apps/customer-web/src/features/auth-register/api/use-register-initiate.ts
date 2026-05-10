import { useMutation } from '@tanstack/react-query';
import { apiClient, EP, parseApiError } from '@ohlify/api';
import type { RegisterInitiateResponse } from '@ohlify/api';

export function useRegisterInitiate() {
  return useMutation({
    mutationFn: async (payload: { email: string; phone: string; channel: 'email' | 'sms' }) => {
      try {
        const res = await apiClient
          .post(EP.AUTH_REGISTER_INITIATE, { json: payload })
          .json<{ data: RegisterInitiateResponse }>();
        return res.data;
      } catch (err) {
        throw await parseApiError(err);
      }
    },
  });
}
