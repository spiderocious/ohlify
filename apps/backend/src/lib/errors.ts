import type { ErrorCode } from '@shared/constants/error-codes.js';
import { HTTP_STATUS } from '@shared/constants/http-status.js';
import type { MessageKey } from '@shared/constants/message-keys.js';

export class AppError extends Error {
  public readonly retryAfter?: number;
  /** Optional i18n key the error handler resolves into the user-facing `errorMessage`. */
  public readonly messageKey?: MessageKey;

  constructor(
    /** Stable string identity (an ErrorCode value) emitted as `reason`. */
    public readonly code: ErrorCode,
    message: string,
    public readonly status = 400,
    public readonly fieldErrors?: Record<string, string[]>,
    retryAfter?: number,
    messageKey?: MessageKey,
  ) {
    super(message);
    this.name = 'AppError';
    if (retryAfter !== undefined) this.retryAfter = retryAfter;
    if (messageKey !== undefined) this.messageKey = messageKey;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, fieldErrors: Record<string, string[]>) {
    super('validation_error', message, HTTP_STATUS.BAD_REQUEST, fieldErrors);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super('unauthorized', message, HTTP_STATUS.UNAUTHORIZED);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super('forbidden', message, HTTP_STATUS.FORBIDDEN);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super('not_found', `${resource} not found`, HTTP_STATUS.NOT_FOUND);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('conflict', message, HTTP_STATUS.CONFLICT);
    this.name = 'ConflictError';
  }
}

export class UnprocessableError extends AppError {
  constructor(message: string) {
    super('validation_error', message, HTTP_STATUS.UNPROCESSABLE_ENTITY);
    this.name = 'UnprocessableError';
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests') {
    super('rate_limited', message, HTTP_STATUS.TOO_MANY_REQUESTS);
    this.name = 'TooManyRequestsError';
  }
}

export class InternalError extends AppError {
  constructor(message = 'Internal server error') {
    super('internal', message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    this.name = 'InternalError';
  }
}

export class GoneError extends AppError {
  constructor(message: string) {
    super('not_found', message, 410);
    this.name = 'GoneError';
  }
}
