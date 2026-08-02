import type { SeverityBand } from '@shared/constants/error-codes.js';

/**
 * Flat error envelope (see docs/error-envelope-redesign.md):
 *   { errorCode, errorMessage, reason, rejectionReason?, fieldErrors? }
 * - errorCode:    numeric severity band (1000–1009), for measurement/alerting.
 * - errorMessage: resolved human-readable text.
 * - reason:       stable string identity clients branch on (an ErrorCode value).
 * - rejectionReason: which branch rejected the request, where `reason` covers
 *   several distinct causes. Diagnostic only — NOT part of the client contract,
 *   so values may be added or renamed without it counting as a breaking change.
 * - fieldErrors:  per-field validation messages; present only for validation errors.
 */
export interface ApiError {
  errorCode: SeverityBand;
  errorMessage: string;
  reason: string;
  rejectionReason?: string;
  fieldErrors?: Record<string, string[]>;
}

export type ApiEnvelope<T> = { data: T; meta?: Record<string, unknown> } | ApiError;
