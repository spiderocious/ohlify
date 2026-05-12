import { useMutation } from '@tanstack/react-query';
import { apiClient, EP, parseApiError } from '@ohlify/api';

export function useRegisterResendOtp() {
  return useMutation({
    mutationFn: async (payload: { registration_token: string }) => {
      try {
        const res = await apiClient
          .post(EP.AUTH_REGISTER_RESEND_OTP, { json: payload })
          .json<{ data: { resend_available_at: string } }>();
        return res.data;
      } catch (err) {
        throw await parseApiError(err);
      }
    },
  });
}
