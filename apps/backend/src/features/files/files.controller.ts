import type { Request, RequestHandler, Response } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { HTTP_STATUS } from '@shared/constants/http-status.js';

import { FileUriQuerySchema, UploadUriQuerySchema } from './files.schema.js';
import * as service from './files.service.js';

/**
 * ⚠ These handlers deliberately bypass `ResponseUtil`.
 *
 * This feature is a drop-in replacement for the standalone Go file-service, and
 * its response bodies are bare JSON with no `{ data }` envelope:
 *
 *     { "key": "...", "uri": "...", "expires_in": "15m" }
 *
 * Shipped mobile builds parse that shape directly (`res.data!['uri']`), and a
 * mobile client cannot be force-updated — wrapping these in the house envelope
 * would break every install that has not updated, for a cosmetic gain. The
 * error shape (`{ "error": "..." }`) is preserved for the same reason.
 *
 * This is the ONLY place in the codebase where `res.json` is called directly,
 * and it stays that way until the old paths are retired. New endpoints must use
 * `ResponseUtil`.
 */

/** Matches the Go service's `{"error": "..."}` body. */
const fail = (res: Response, status: number, message: string): void => {
  res.status(status).json({ error: message });
};

/**
 * Flattens a Zod query failure to the single-string error the Go service
 * returned, so clients see the same message text for the same bad input.
 */
const firstIssue = (issues: { message: string }[], fallback: string): string =>
  issues[0]?.message ?? fallback;

export const getUploadUri: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const parsed = UploadUriQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    fail(res, HTTP_STATUS.BAD_REQUEST, firstIssue(parsed.error.issues, 'invalid query'));
    return;
  }

  const result = await service.createUploadUri(parsed.data);
  if (!result.success) {
    fail(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'failed to generate upload URI');
    return;
  }

  res.status(HTTP_STATUS.OK).json(result.data);
});

export const getFileUri: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const parsed = FileUriQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    fail(res, HTTP_STATUS.BAD_REQUEST, firstIssue(parsed.error.issues, 'key is required'));
    return;
  }

  const result = await service.getFileUri(parsed.data);
  if (!result.success) {
    fail(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'failed to generate file URI');
    return;
  }

  res.status(HTTP_STATUS.OK).json(result.data);
});
