import { Env } from '@shared/config/env';
import { tokenService } from '@shared/services/token-service';
import { ApiError } from '@shared/types/api-error';

/**
 * Thin fetch wrapper that unwraps the backend's `{ data, meta }` envelope
 * before handing the body to caller-supplied `fromJson`. Mirrors
 * mobile/lib/shared/api/api_client.dart — same base-url normalization,
 * same envelope-unwrap policy, same auth-header-injection +
 * single-flight-refresh-and-retry-once behavior (folded in here rather than
 * as separate Dio-style interceptors, since fetch has no interceptor
 * concept — see AuthInterceptor/ErrorInterceptor in the Dart source for the
 * original two-file split).
 */
type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

interface RequestOptions {
  queryParams?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  idempotencyKey?: string;
  /** Skip attaching the Authorization header and skip the refresh-on-401 flow (e.g. auth/refresh itself). */
  skipAuth?: boolean;
}

const NON_RETRYABLE_REASONS = new Set([
  'invalid_credentials',
  'account_locked',
  'account_suspended',
  'account_blocked',
  'session_revoked',
  'session_expired',
  'token_invalid',
]);

/** Set by app.tsx after the auth session context mounts, so this module-level client can trigger a forced logout without a circular import. */
let onForceLogout: (() => void) | null = null;
export function setOnForceLogout(handler: () => void): void {
  onForceLogout = handler;
}

/** Strips a leading `/` so the path resolves relative to the base URL (which carries the `/api/v1` prefix) rather than the host root. */
function normalizePath(path: string): string {
  return path.startsWith('/') ? path.slice(1) : path;
}

function baseUrl(): string {
  return Env.apiBaseUrl.endsWith('/') ? Env.apiBaseUrl : `${Env.apiBaseUrl}/`;
}

function buildUrl(path: string, queryParams?: RequestOptions['queryParams']): string {
  const url = new URL(normalizePath(path), baseUrl());
  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function parseErrorResponse(response: Response): Promise<ApiError> {
  const retryAfterHeader = response.headers.get('retry-after');
  const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // No JSON body — ApiError.fromBody falls back to defaults.
  }
  return ApiError.fromBody({
    statusCode: response.status,
    body,
    retryAfterSeconds: Number.isNaN(retryAfterSeconds) ? undefined : retryAfterSeconds,
  });
}

/** POST auth/refresh directly, bypassing the auth-retry flow so a 401 here can't recurse. Updates the token store on success. */
let ongoingRefresh: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refresh = tokenService.refreshToken;
  if (!refresh) {
    throw new ApiError({
      statusCode: 401,
      errorCode: 1002,
      reason: 'session_expired',
      message: 'No refresh token',
    });
  }
  const response = await fetch(buildUrl('auth/refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refresh }),
  });
  if (!response.ok) {
    throw await parseErrorResponse(response);
  }
  const root = (await response.json()) as { data: { access_token: string; refresh_token: string } };
  const { access_token: newAccess, refresh_token: newRefresh } = root.data;
  await tokenService.setTokens({ accessToken: newAccess, refreshToken: newRefresh });
  return newAccess;
}

function refreshOnce(): Promise<string> {
  if (!ongoingRefresh) {
    ongoingRefresh = refreshAccessToken().finally(() => {
      ongoingRefresh = null;
    });
  }
  return ongoingRefresh;
}

async function rawFetch(
  method: HttpMethod,
  path: string,
  options: RequestOptions,
  accessTokenOverride?: string,
): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = accessTokenOverride ?? tokenService.accessToken;
  if (!options.skipAuth && token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (options.idempotencyKey) {
    headers['Idempotency-Key'] = options.idempotencyKey;
  }
  return fetch(buildUrl(path, options.queryParams), {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

async function send<T>(
  method: HttpMethod,
  path: string,
  options: RequestOptions,
  fromJson: (data: unknown) => T,
): Promise<T> {
  let response: Response;
  try {
    response = await rawFetch(method, path, options);
  } catch {
    throw ApiError.network;
  }

  if (!response.ok) {
    const apiError = await parseErrorResponse(response);

    const isRetryable =
      response.status === 401 &&
      !options.skipAuth &&
      tokenService.refreshToken !== null &&
      !NON_RETRYABLE_REASONS.has(apiError.reason);

    if (isRetryable) {
      try {
        const newAccess = await refreshOnce();
        const retried = await rawFetch(method, path, options, newAccess);
        if (retried.ok) {
          return fromJson(await unwrapEnvelope(retried));
        }
        // Retry still failed — fall through to the hard-logout handling below
        // using the retried response's error, matching the Dart interceptor's
        // "isRetry && status == 401" branch.
        if (retried.status === 401) {
          await tokenService.clear();
          onForceLogout?.();
        }
        throw await parseErrorResponse(retried);
      } catch (refreshError) {
        if (refreshError instanceof ApiError) throw refreshError;
        throw apiError;
      }
    }

    if (apiError.reason === 'session_revoked' || apiError.reason === 'session_expired') {
      await tokenService.clear();
      onForceLogout?.();
    }

    throw apiError;
  }

  return fromJson(await unwrapEnvelope(response));
}

/**
 * Unwrap policy (mirrors ApiClient._send in the Dart source):
 *  - Paginated responses come back as `{ data: [...], meta: {...} }`. Hand
 *    the WHOLE root to `fromJson` so callers can read `meta`.
 *  - Non-paginated responses are `{ data: <payload> }` — unwrap to `data`.
 *  - If the body isn't an envelope, pass it through unchanged.
 */
async function unwrapEnvelope(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  let root: unknown;
  try {
    root = await response.json();
  } catch {
    return null;
  }
  if (root && typeof root === 'object' && 'data' in root) {
    const asRecord = root as Record<string, unknown>;
    return 'meta' in asRecord ? root : asRecord.data;
  }
  return root;
}

export const apiClient = {
  get: <T>(path: string, opts: Omit<RequestOptions, 'body'> & { fromJson: (data: unknown) => T }) =>
    send('GET', path, opts, opts.fromJson),
  post: <T>(path: string, body: unknown, opts: Omit<RequestOptions, 'body'> & { fromJson: (data: unknown) => T }) =>
    send('POST', path, { ...opts, body }, opts.fromJson),
  patch: <T>(path: string, body: unknown, opts: Omit<RequestOptions, 'body'> & { fromJson: (data: unknown) => T }) =>
    send('PATCH', path, { ...opts, body }, opts.fromJson),
  put: <T>(path: string, body: unknown, opts: Omit<RequestOptions, 'body'> & { fromJson: (data: unknown) => T }) =>
    send('PUT', path, { ...opts, body }, opts.fromJson),
  delete: <T>(path: string, opts: Omit<RequestOptions, 'body'> & { fromJson: (data: unknown) => T; body?: unknown }) =>
    send('DELETE', path, opts, opts.fromJson),
};
