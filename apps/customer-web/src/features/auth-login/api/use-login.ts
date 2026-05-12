import { useMutation } from '@tanstack/react-query';
import { apiClient, EP, session, parseApiError } from '@ohlify/api';
import type { LoginResponse } from '@ohlify/api';

export function useLogin() {
  return useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      try {
        const res = await apiClient
          .post(EP.AUTH_LOGIN, { json: payload })
          .json<{ data: LoginResponse }>();
        session.save(res.data);
        return res.data;
      } catch (err) {
        throw await parseApiError(err);
      }
    },
  });
}
