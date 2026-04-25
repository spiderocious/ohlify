import { AppError } from '@lib/errors.js';
import type { ServiceError } from '@lib/service-result.js';

// Translates a ServiceError into an AppError thrown for the error handler to
// render. Threads errorCode, httpStatus, retryAfter, AND fieldErrors so
// service-level validation_error responses preserve their field_errors envelope.
export const bail = (err: ServiceError): never => {
  throw new AppError(
    err.errorCode ?? 'internal',
    'Request failed',
    err.httpStatus ?? 400,
    err.fieldErrors,
    err.retryAfter,
  );
};
