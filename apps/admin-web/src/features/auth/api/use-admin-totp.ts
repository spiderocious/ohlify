import { useMutation } from '@tanstack/react-query';

import {
  ADMIN_EP,
  adminApiClient,
  adminSession,
  parseApiError,
  type AdminTotpSetupResponse,
  type ApiError,
} from '@ohlify/api';

/**
 * TOTP setup is gated on re-confirming the password — the server returns
 * the secret + provisioning URL only after this re-auth, so we don't expose
 * it via passive API browsing. Caller renders the QR code from
 * `qr_data_url` and asks for a 6-digit confirm code.
 */
export function useAdminTotpSetup() {
  return useMutation<AdminTotpSetupResponse, ApiError, { password: string }>({
    mutationFn: async (vars) => {
      try {
        const res = await adminApiClient
          .post(ADMIN_EP.AUTH_TOTP_SETUP, { json: vars })
          .json<{ data: AdminTotpSetupResponse }>();
        return res.data;
      } catch (err) {
        throw await parseApiError(err);
      }
    },
  });
}

/**
 * Confirms a 6-digit TOTP code against the just-issued secret. On success
 * the cached admin user is updated to reflect `totp_enabled: true` so the
 * topbar / settings page render the new state without a refetch.
 */
export function useAdminTotpConfirm() {
  return useMutation<void, ApiError, { code: string }>({
    mutationFn: async (vars) => {
      try {
        await adminApiClient.post(ADMIN_EP.AUTH_TOTP_CONFIRM, { json: vars }).json();
        const current = adminSession.getUser();
        if (current) adminSession.saveUser({ ...current, totp_enabled: true });
      } catch (err) {
        throw await parseApiError(err);
      }
    },
  });
}
