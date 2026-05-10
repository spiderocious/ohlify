import { useMutation } from '@tanstack/react-query';
import { apiClient, EP, parseApiError } from '@ohlify/api';

export function useFpVerifyOtp() {
  return useMutation({
    mutationFn: async (payload: { email: string; otp: string }) => {
      try {
        const res = await apiClient
          .post(EP.AUTH_FP_VERIFY_OTP, { json: payload })
          .json<{ data: { reset_token: string } }>();
        return res.data;
      } catch (err) {
        throw await parseApiError(err);
      }
    },
  });
}
