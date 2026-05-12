import { useMutation } from '@tanstack/react-query';
import { apiClient, EP, parseApiError } from '@ohlify/api';

export function useRequestPasswordOtp() {
  return useMutation({
    mutationFn: async () => {
      try {
        await apiClient.post(EP.ME_SENSITIVE_OTP, { json: { action: 'change_password' } });
      } catch (err) {
        throw await parseApiError(err);
      }
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (payload: { otp: string; current_password: string; new_password: string }) => {
      try {
        await apiClient.post(EP.ME_PASSWORD, { json: payload });
      } catch (err) {
        throw await parseApiError(err);
      }
    },
  });
}
