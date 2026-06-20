import type { SeverityBand } from '@shared/constants/error-codes.js';

/**
 * Flat error envelope (see docs/error-envelope-redesign.md):
 *   { errorCode, errorMessage, reason, fieldErrors? }
 * - errorCode:    numeric severity band (1000–1009), for measurement/alerting.
 * - errorMessage: resolved human-readable text.
 * - reason:       stable string identity clients branch on (an ErrorCode value).
 * - fieldErrors:  per-field validation messages; present only for validation errors.
 */
export interface ApiError {
  errorCode: SeverityBand;
  errorMessage: string;
  reason: string;
  fieldErrors?: Record<string, string[]>;
}

export type ApiEnvelope<T> = { data: T; meta?: Record<string, unknown> } | ApiError;
