import type { Request, Response, NextFunction } from 'express';
import type { ZodTypeAny } from 'zod';

import { ResponseUtil } from '@lib/response.js';
import { ERROR_CODES, severityFor } from '@shared/constants/error-codes.js';
import { firstFieldError, resolveErrorMessage } from '@shared/constants/error-messages.js';
import { HTTP_STATUS } from '@shared/constants/http-status.js';

type RequestPart = 'body' | 'query' | 'params';

// Returns a middleware that validates req[part] against schema.
// On failure: 400 with the FIRST invalid field only (one error at a time).
// On success: replaces req[part] with the parsed (coerced/stripped) value.
export const validate =
  <T extends ZodTypeAny>(schema: T, part: RequestPart = 'body') =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      const first = firstFieldError(result.error.issues);
      ResponseUtil.error(res, HTTP_STATUS.BAD_REQUEST, {
        errorCode: severityFor(ERROR_CODES.VALIDATION_ERROR),
        errorMessage: first?.message ?? resolveErrorMessage(ERROR_CODES.VALIDATION_ERROR),
        reason: ERROR_CODES.VALIDATION_ERROR,
        ...(first ? { fieldErrors: first.fieldErrors } : {}),
      });
      return;
    }
    (req as unknown as Record<string, unknown>)[part] = result.data;
    next();
  };
