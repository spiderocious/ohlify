import { AppError } from '@lib/errors.js';
import type { ServiceError } from '@lib/service-result.js';

// Translates a ServiceError into an AppError thrown for the error handler to
// render. Threads errorCode (→ reason), httpStatus, retryAfter, fieldErrors AND
// the messageKey so the handler resolves a real user-facing `errorMessage`
// instead of the old hardcoded 'Request failed'. The internal Error message is
// kept only for logs/stack traces — never serialized.
export const bail = (err: ServiceError): never => {
  const reason = err.errorCode ?? 'internal';
  throw new AppError(
    reason,
    reason,
    err.httpStatus ?? 400,
    err.fieldErrors,
    err.retryAfter,
    err.messageKey,
  );
};
