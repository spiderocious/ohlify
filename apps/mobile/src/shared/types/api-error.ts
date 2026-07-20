/**
 * Mirrors the backend's flat error envelope, same as
 * mobile/lib/shared/types/api_error.dart:
 *   { "errorCode": 1000,
 *     "errorMessage": "Cannot book yourself",
 *     "reason": "cannot_book_self",
 *     "fieldErrors": { "field": ["msg"] } }
 *
 * Always key UI off `reason` (the stable string identity). `message` is a
 * resolved, user-displayable string; `errorCode` is a numeric severity band
 * (1000-1009) for measurement / coarse handling.
 */
export class ApiError extends Error {
  readonly statusCode: number;
  /** Numeric severity band (1000-1009). 0 for client-side/network errors. */
  readonly errorCode: number;
  /** Stable string identity to branch on (e.g. 'invalid_otp', 'cannot_book_self'). */
  readonly reason: string;
  readonly fieldErrors: Record<string, string[]>;
  readonly retryAfterSeconds?: number;

  constructor(params: {
    statusCode: number;
    errorCode: number;
    reason: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
    retryAfterSeconds?: number;
  }) {
    super(params.message);
    this.name = 'ApiError';
    this.statusCode = params.statusCode;
    this.errorCode = params.errorCode;
    this.reason = params.reason;
    this.fieldErrors = params.fieldErrors ?? {};
    this.retryAfterSeconds = params.retryAfterSeconds;
  }

  get isValidation(): boolean {
    return this.reason === 'validation_error';
  }
  get isUnauthorized(): boolean {
    return this.statusCode === 401;
  }
  get isRateLimited(): boolean {
    return this.reason === 'rate_limited';
  }
  get isNetwork(): boolean {
    return this.reason === 'network_error';
  }
  get isServerError(): boolean {
    return this.errorCode === 1009;
  }
  get isUpstreamError(): boolean {
    return this.errorCode === 1008;
  }

  /** First field error for a given key, if any — for inline form display. */
  fieldError(field: string): string | undefined {
    return this.fieldErrors[field]?.[0];
  }

  /** The single first field error across all fields (backend sends one field at a time). */
  get firstFieldError(): string | undefined {
    for (const messages of Object.values(this.fieldErrors)) {
      if (messages.length > 0) return messages[0];
    }
    return undefined;
  }

  static fromBody(params: {
    statusCode: number;
    body: unknown;
    retryAfterSeconds?: number;
  }): ApiError {
    let errorCode = 1009;
    let reason = 'internal';
    let message = 'An unexpected error occurred.';
    let fieldErrors: Record<string, string[]> = {};

    if (params.body && typeof params.body === 'object') {
      const b = params.body as Record<string, unknown>;
      if (typeof b.errorCode === 'number') errorCode = b.errorCode;
      if (typeof b.reason === 'string') reason = b.reason;
      if (typeof b.errorMessage === 'string') message = b.errorMessage;
      if (b.fieldErrors && typeof b.fieldErrors === 'object') {
        fieldErrors = Object.fromEntries(
          Object.entries(b.fieldErrors as Record<string, unknown>).map(([key, value]) => [
            key,
            Array.isArray(value) ? value.map(String) : [String(value)],
          ]),
        );
      }
    }

    return new ApiError({
      statusCode: params.statusCode,
      errorCode,
      reason,
      message,
      fieldErrors,
      retryAfterSeconds: params.retryAfterSeconds,
    });
  }

  static readonly network = new ApiError({
    statusCode: 0,
    errorCode: 0,
    reason: 'network_error',
    message: 'Network error. Check your connection and try again.',
  });
}

/** Maps `error.reason` to a user-facing message. Falls back to the server message. */
const REASON_MESSAGES: Record<string, string> = {
  validation_error: 'Please check the form and try again.',
  invalid_otp: 'The code you entered is incorrect.',
  otp_expired: 'This code has expired. Request a new one.',
  otp_max_attempts: 'Too many incorrect attempts. Request a new code.',
  token_invalid: 'This link or code is no longer valid. Please start again.',
  credential_not_set: 'Please set your password first.',
  email_exists: 'An account with this email already exists.',
  phone_exists: 'An account with this phone number already exists.',
  invalid_credentials: 'The email or password you entered is incorrect.',
  account_locked: 'Your account is temporarily locked. Try again in a few minutes.',
  account_suspended: 'Your account has been suspended. Contact support.',
  account_blocked: 'This account is no longer accessible.',
  session_revoked: 'Your session has expired. Please log in again.',
  session_expired: 'Your session has expired. Please log in again.',
  rate_limited: 'Too many requests. Please wait a moment and try again.',
  unauthorized: 'Please log in to continue.',
  not_found: 'We couldn’t find what you were looking for.',
  network_error: 'Network error. Check your connection and try again.',
};

export function apiErrorMessageForReason(reason: string, fallback?: string): string {
  return REASON_MESSAGES[reason] ?? fallback ?? 'Something went wrong. Please try again.';
}

export function apiErrorMessage(error: ApiError): string {
  return apiErrorMessageForReason(error.reason, error.message);
}
