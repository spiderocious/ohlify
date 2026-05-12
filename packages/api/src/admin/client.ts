import ky, { type KyInstance } from 'ky';

import { ADMIN_EP } from './endpoints.js';
import { adminSession, ADMIN_TOKEN_KEYS } from './session.js';

/**
 * Separate ky instance for admin endpoints. Mirrors `client.ts` but:
 *   - reads + writes admin token keys (not customer ones)
 *   - refreshes against /api/v1/admin/auth/refresh
 *   - on terminal 401 redirects to /login (admin login route, not customer's)
 *
 * Same in-flight-refresh guard so a burst of 401s only triggers one refresh.
 */

let _baseUrl = 'http://localhost:8082/';
let refreshPromise: Promise<void> | null = null;

export function configureAdminApiClient(baseUrl: string) {
  _baseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

export const adminApiClient: KyInstance = ky.create({
  get prefixUrl() {
    return _baseUrl;
  },
  headers: { 'Content-Type': 'application/json' },
  hooks: {
    beforeRequest: [
      (request) => {
        const token = adminSession.getAccess();
        if (token) request.headers.set('Authorization', `Bearer ${token}`);
      },
    ],
    afterResponse: [
      async (request, _options, response) => {
        if (response.status !== 401) return response;

        // Don't intercept 401s on admin auth endpoints — let them surface as
        // typed errors (bad creds, totp wrong, etc.) instead of redirecting.
        if (request.url.includes('/admin/auth/')) return response;

        if (!refreshPromise) {
          refreshPromise = (async () => {
            const refresh = adminSession.getRefresh();
            if (!refresh) {
              clearAdminAndRedirect();
              return;
            }
            try {
              const res = await ky
                .post(`${_baseUrl}${ADMIN_EP.AUTH_REFRESH}`, {
                  json: { refresh_token: refresh },
                })
                .json<{ data: { access_token: string; refresh_token: string } }>();
              localStorage.setItem(ADMIN_TOKEN_KEYS.ACCESS, res.data.access_token);
              localStorage.setItem(ADMIN_TOKEN_KEYS.REFRESH, res.data.refresh_token);
            } catch {
              clearAdminAndRedirect();
            } finally {
              refreshPromise = null;
            }
          })();
        }

        await refreshPromise;

        const newToken = adminSession.getAccess();
        if (newToken) request.headers.set('Authorization', `Bearer ${newToken}`);
        return ky(request);
      },
    ],
  },
});

function clearAdminAndRedirect() {
  adminSession.clear();
  window.location.href = '/login';
}
