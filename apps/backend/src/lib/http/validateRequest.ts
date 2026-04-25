import type { Request, Response, NextFunction } from 'express';
import type { ZodTypeAny, ZodError } from 'zod';

import { ResponseUtil } from '@lib/response.js';
import { HTTP_STATUS } from '@shared/constants/http-status.js';

type RequestPart = 'body' | 'query' | 'params';

// Formats a ZodError into the field_errors envelope shape.
const formatZodError = (err: ZodError): Record<string, string[]> => {
  const out: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = issue.path.join('.') || '_root';
    const arr = (out[key] ??= []);
    arr.push(issue.message);
  }
  return out;
};

// Returns a middleware that validates req[part] against schema.
// On failure: 400 with field_errors in the envelope.
// On success: replaces req[part] with the parsed (coerced/stripped) value.
export const validate =
  <T extends ZodTypeAny>(schema: T, part: RequestPart = 'body') =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      ResponseUtil.error(res, HTTP_STATUS.BAD_REQUEST, {
        code: 'validation_error',
        message: 'Validation failed',
        field_errors: formatZodError(result.error),
      });
      return;
    }
    (req as unknown as Record<string, unknown>)[part] = result.data;
    next();
  };
