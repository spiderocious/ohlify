import ky, { type KyInstance } from 'ky';
import { TOKEN_KEYS, createTokenStorage } from '@ohlify/core';
import { EP } from './endpoints.js';

const storage = createTokenStorage();

/**
 * Building Ky lazily — and proxying access to it — is what saves us from
 * the captured-prefix-URL bug. Older shape did `ky.create({ prefixUrl })`
 * at module-load time, before `configureApiClient` ran. Ky reads its
 * options eagerly, so the prefix was frozen to `undefined` and every
 * request fell back to `window.location.origin` in production.
 *
 * Now: `createApiClient(baseUrl)` builds the real Ky instance.
 * `configureApiClient` installs it as the singleton. The exported
 * `apiClient` is a `Proxy` whose every property access forwards to that
 * singleton, so consumers keep using `apiClient.get(...)` unchanged.
 * If anyone uses it before init, it throws a loud error.
 */

let _client: KyInstance | null = null;
let _baseUrl: string | null = null;
let refreshPromise: Promise<void> | null = null;

export function createApiClient(baseUrl: string): KyInstance {
  if (!baseUrl) {
    throw new Error('createApiClient: baseUrl is required');
  }
  const prefixUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

  return ky.create({
    prefixUrl,
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
                // Use a fresh top-level ky.post here (not `_client`) so the
                // refresh call can't recurse through this same afterResponse
                // hook on its own 401.
                const res = await ky
                  .post(`${prefixUrl}${EP.AUTH_REFRESH}`, {
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
}

/**
 * Installs the singleton instance the rest of the app reaches through
 * `apiClient`. Must be called once at boot before any request fires.
 * Calling again replaces the instance (handy for tests).
 */
export function configureApiClient(baseUrl: string): void {
  _baseUrl = baseUrl;
  _client = createApiClient(baseUrl);
}

/**
 * Public façade. Every property access is forwarded to the lazily-
 * initialized real client. `Reflect.get` (vs. a plain `_client[prop]`)
 * preserves the correct `this` binding for any Ky internals that rely
 * on it.
 */
export const apiClient: KyInstance = new Proxy({} as KyInstance, {
  get(_target, prop) {
    if (!_client) {
      throw new Error(
        'apiClient used before configureApiClient was called. Call configureApiClient(baseUrl) at app boot.',
      );
    }
    return Reflect.get(_client, prop, _client);
  },
});

/** Test/diagnostic helper. Not used by app code. */
export function _currentApiBaseUrl(): string | null {
  return _baseUrl;
}

function clearTokensAndRedirect() {
  storage.remove(TOKEN_KEYS.ACCESS);
  storage.remove(TOKEN_KEYS.REFRESH);
  window.location.href = '/login';
}
