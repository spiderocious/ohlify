import ky, { type KyInstance } from 'ky';
import { TOKEN_KEYS, createTokenStorage } from '@ohlify/core';
import { EP } from './endpoints.js';

const storage = createTokenStorage();

declare global {
  interface Window {
    BASE_URL: string;
  }
}

let _baseUrl = window?.BASE_URL;
let refreshPromise: Promise<void> | null = null;

export function configureApiClient(baseUrl: string) {
  _baseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

export const apiClient: KyInstance = ky.create({
  get prefixUrl() { return _baseUrl; },
  headers: { 'Content-Type': 'application/json' },
  hooks: {
    beforeRequest: [
      (request) => {
        const token = storage.get(TOKEN_KEYS.ACCESS);
        if (token) request.headers.set('Authorization', `Bearer ${token}`);
      },
    ],
    afterResponse: [
      async (request, _options, response) => {
        if (response.status !== 401) return response;

        // Don't intercept 401s on auth endpoints — let them propagate as errors.
        if (request.url.includes('/auth/')) return response;

        if (!refreshPromise) {
          refreshPromise = (async () => {
            const refresh = storage.get(TOKEN_KEYS.REFRESH);
            if (!refresh) {
              clearTokensAndRedirect();
              return;
            }
            try {
              const res = await ky
                .post(`${_baseUrl}${EP.AUTH_REFRESH}`, {
                  json: { refresh_token: refresh },
                })
                .json<{ data: { access_token: string; refresh_token: string } }>();
              storage.set(TOKEN_KEYS.ACCESS, res.data.access_token);
              storage.set(TOKEN_KEYS.REFRESH, res.data.refresh_token);
            } catch {
              clearTokensAndRedirect();
            } finally {
              refreshPromise = null;
            }
          })();
        }

        await refreshPromise;

        const newToken = storage.get(TOKEN_KEYS.ACCESS);
        if (newToken) request.headers.set('Authorization', `Bearer ${newToken}`);
        return ky(request);
      },
    ],
  },
});

function clearTokensAndRedirect() {
  storage.remove(TOKEN_KEYS.ACCESS);
  storage.remove(TOKEN_KEYS.REFRESH);
  window.location.href = '/login';
}
