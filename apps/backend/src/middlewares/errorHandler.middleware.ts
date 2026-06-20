import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

import { AppError } from '@lib/errors.js';
import { requestContext } from '@lib/http/requestContext.js';
import { logger } from '@lib/logger.js';
import { ResponseUtil } from '@lib/response.js';
import { ERROR_CODES, severityFor } from '@shared/constants/error-codes.js';
import { firstFieldError, resolveErrorMessage } from '@shared/constants/error-messages.js';
import { HTTP_STATUS } from '@shared/constants/http-status.js';

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const requestId = requestContext.getRequestId();

  if (err instanceof AppError) {
    if (err.status >= 500) {
      logger.error({ err, requestId, reason: err.code }, err.message);
    }
    if (err.retryAfter !== undefined) {
      res.setHeader('Retry-After', err.retryAfter);
    }
    ResponseUtil.error(res, err.status, {
      errorCode: severityFor(err.code),
      errorMessage: resolveErrorMessage(err.code, err.messageKey),
      reason: err.code,
      ...(err.fieldErrors !== undefined ? { fieldErrors: err.fieldErrors } : {}),
    });
    return;
  }

  if (err instanceof ZodError) {
    // One field at a time: surface only the first invalid field.
    const first = firstFieldError(err.issues);
    ResponseUtil.error(res, HTTP_STATUS.BAD_REQUEST, {
      errorCode: severityFor(ERROR_CODES.VALIDATION_ERROR),
      errorMessage: first?.message ?? resolveErrorMessage(ERROR_CODES.VALIDATION_ERROR),
      reason: ERROR_CODES.VALIDATION_ERROR,
      ...(first ? { fieldErrors: first.fieldErrors } : {}),
    });
    return;
  }

  logger.error({ err, requestId, reason: ERROR_CODES.INTERNAL }, 'Unhandled error');
  ResponseUtil.error(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, {
    errorCode: severityFor(ERROR_CODES.INTERNAL),
    errorMessage: resolveErrorMessage(ERROR_CODES.INTERNAL),
    reason: ERROR_CODES.INTERNAL,
  });
};
