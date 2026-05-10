import { useMutation } from '@tanstack/react-query';

import {
  ADMIN_EP,
  adminApiClient,
  adminSession,
  parseApiError,
  type AdminLoginResponse,
  type ApiError,
} from '@ohlify/api';

interface LoginVars {
  email: string;
  password: string;
  totp_code?: string;
}

/**
 * Two-stage flow: first call without `totp_code`. If the admin already has
 * TOTP enabled the server responds with `totp_required: true` and an empty
 * tokens block — the screen then prompts for a code and re-submits with
 * `totp_code` populated. Tokens are only persisted once both stages clear.
 */
export function useAdminLogin() {
  return useMutation<AdminLoginResponse, ApiError, LoginVars>({
    mutationFn: async (vars) => {
      try {
        const res = await adminApiClient
          .post(ADMIN_EP.AUTH_LOGIN, { json: vars })
          .json<{ data: AdminLoginResponse }>();
        if (!res.data.totp_required) {
          adminSession.save(
            { access_token: res.data.access_token, refresh_token: res.data.refresh_token },
            res.data.admin,
          );
        }
        return res.data;
      } catch (err) {
        throw await parseApiError(err);
      }
    },
  });
}
