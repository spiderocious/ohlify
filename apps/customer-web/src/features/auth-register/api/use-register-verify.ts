import { useMutation } from '@tanstack/react-query';
import { apiClient, EP, session, parseApiError } from '@ohlify/api';
import type { RegisterVerifyResponse } from '@ohlify/api';

export function useRegisterVerify() {
  return useMutation({
    mutationFn: async (payload: { registration_token: string; otp: string }) => {
      try {
        const res = await apiClient
          .post(EP.AUTH_REGISTER_VERIFY, { json: payload })
          .json<{ data: RegisterVerifyResponse }>();
        session.save(res.data);
        return res.data;
      } catch (err) {
        throw await parseApiError(err);
      }
    },
  });
}
