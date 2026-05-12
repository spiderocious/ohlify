import type { HTTPError } from 'ky';

export interface ApiError {
  code: string;
  message: string;
  field_errors?: Record<string, string[]>;
}

export interface ApiErrorResponse {
  error: ApiError;
}

export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

export async function parseApiError(err: unknown): Promise<ApiError> {
  if (err && typeof err === 'object' && 'response' in err) {
    try {
      const body = await (err as HTTPError).response.json<ApiErrorResponse>();
      return body.error;
    } catch {
      // fall through to generic error
    }
  }
  console.error('Unexpected API error format:', err);
  return { code: 'internal', message: 'An unexpected error occurred' };
}
