import { useMutation } from '@tanstack/react-query';
import { apiClient, EP, session, parseApiError } from '@ohlify/api';

export function useRequestDeleteAccountOtp() {
  return useMutation({
    mutationFn: async () => {
      try {
        await apiClient.post(EP.ME_SENSITIVE_OTP, { json: { action: 'delete_account' } });
      } catch (err) {
        throw await parseApiError(err);
      }
    },
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: async (payload: { otp: string }) => {
      try {
        await apiClient.delete(EP.ME_DELETE, { json: { ...payload, confirm: true } });
      } catch (err) {
        throw await parseApiError(err);
      }
    },
    onSuccess: () => {
      session.clear();
    },
  });
}
