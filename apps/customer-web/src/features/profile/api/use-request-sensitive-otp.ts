import { useMutation } from '@tanstack/react-query';
import { apiClient, EP, parseApiError } from '@ohlify/api';

type SensitiveAction = 'change_email' | 'change_phone' | 'change_password' | 'delete_account';

// Requests the OTP for a sensitive account action. This MUST be called before
// prompting the user for the code — previously the email/phone change flow
// showed an "we sent a code" modal without ever requesting one, so every
// confirmation failed with invalid_otp. (BUGS.md M10.)
export function useRequestSensitiveOtp() {
  return useMutation({
    mutationFn: async (action: SensitiveAction) => {
      try {
        await apiClient.post(EP.ME_SENSITIVE_OTP, { json: { action } });
      } catch (err) {
        throw await parseApiError(err);
      }
    },
  });
}
