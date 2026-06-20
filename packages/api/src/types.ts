import type { HTTPError } from 'ky';

/**
 * Numeric severity bands the backend emits as `errorCode` (1000–1009). The last
 * digit encodes severity, ascending from a benign body typo to a server fault.
 * Mirrors the backend's SEVERITY_BANDS POJO. Branch on `reason` (the stable
 * string identity) for behaviour; use the band for measurement / coarse UX
 * (e.g. show a generic toast for SERVER, an inline message for BODY_VALIDATION).
 */
export const SeverityBand = {
  BODY_VALIDATION: 1000,
  VALIDATION_SUSPICIOUS: 1001,
  AUTH: 1002,
  FORBIDDEN: 1003,
  NOT_FOUND: 1004,
  CONFLICT: 1005,
  BUSINESS_RULE: 1006,
  RATE_LIMITED: 1007,
  UPSTREAM: 1008,
  SERVER: 1009,
} as const;
export type SeverityBand = (typeof SeverityBand)[keyof typeof SeverityBand];

/**
 * Flat error envelope (see docs/error-envelope-redesign.md):
 *   { errorCode, errorMessage, reason, fieldErrors? }
 * - errorCode:    numeric severity band.
 * - errorMessage: resolved, user-displayable text.
 * - reason:       stable string identity to branch on.
 * - fieldErrors:  present only for validation errors; the backend sends ONE
 *                 field at a time (the first invalid field), so callers can read
 *                 the single entry directly.
 */
export interface ApiError {
  errorCode: SeverityBand;
  errorMessage: string;
  reason: string;
  fieldErrors?: Record<string, string[]>;
}

export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: ApiError };

const FALLBACK_ERROR: ApiError = {
  errorCode: SeverityBand.SERVER,
  errorMessage: 'An unexpected error occurred',
  reason: 'internal',
};

/** True when a parsed body carries the flat error envelope shape. */
const isApiErrorBody = (body: unknown): body is ApiError =>
  body !== null &&
  typeof body === 'object' &&
  typeof (body as ApiError).reason === 'string' &&
  typeof (body as ApiError).errorMessage === 'string';

export async function parseApiError(err: unknown): Promise<ApiError> {
  if (err && typeof err === 'object' && 'response' in err) {
    try {
      const body = await (err as HTTPError).response.json<unknown>();
      if (isApiErrorBody(body)) return body;
    } catch {
      // fall through to generic error
    }
  }
  console.error('Unexpected API error format:', err);
  return FALLBACK_ERROR;
}

/** First field error message for a given field, if present. */
export const fieldError = (err: ApiError, field: string): string | undefined =>
  err.fieldErrors?.[field]?.[0];

/** The single first field error (any field), if the error carries one. */
export const firstFieldError = (err: ApiError): string | undefined => {
  const entries = err.fieldErrors ? Object.values(err.fieldErrors) : [];
  return entries[0]?.[0];
};
