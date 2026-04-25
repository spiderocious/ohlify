import type { Request, Response, NextFunction } from 'express';

import { AppError } from '@lib/errors.js';
import { requestContext } from '@lib/http/requestContext.js';
import { logger } from '@lib/logger.js';
import { ResponseUtil } from '@lib/response.js';
import { HTTP_STATUS } from '@shared/constants/http-status.js';

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const requestId = requestContext.getRequestId();

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, requestId }, err.message);
    }
    ResponseUtil.error(res, err.statusCode, {
      code: err.code,
      message: err.message,
      ...(err.fieldErrors ? { field_errors: err.fieldErrors } : {}),
    });
    return;
  }

  logger.error({ err, requestId }, 'Unhandled error');
  ResponseUtil.error(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, {
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  });
};
