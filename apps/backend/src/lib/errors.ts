import { HTTP_STATUS } from '@shared/constants/http-status.js';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, fieldErrors: Record<string, string[]>) {
    super(HTTP_STATUS.BAD_REQUEST, 'VALIDATION_ERROR', message, fieldErrors);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(HTTP_STATUS.UNAUTHORIZED, 'UNAUTHORIZED', message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(HTTP_STATUS.FORBIDDEN, 'FORBIDDEN', message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(HTTP_STATUS.NOT_FOUND, 'NOT_FOUND', `${resource} not found`);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(HTTP_STATUS.CONFLICT, 'CONFLICT', message);
    this.name = 'ConflictError';
  }
}

export class UnprocessableError extends AppError {
  constructor(message: string) {
    super(HTTP_STATUS.UNPROCESSABLE_ENTITY, 'UNPROCESSABLE', message);
    this.name = 'UnprocessableError';
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests') {
    super(HTTP_STATUS.TOO_MANY_REQUESTS, 'TOO_MANY_REQUESTS', message);
    this.name = 'TooManyRequestsError';
  }
}

export class InternalError extends AppError {
  constructor(message = 'Internal server error') {
    super(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'INTERNAL_ERROR', message);
    this.name = 'InternalError';
  }
}
