import crypto from 'node:crypto';

import type { Request, Response, RequestHandler } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { bail } from '@lib/http/bail.js';
import { ResponseUtil } from '@lib/response.js';
import { ERROR_CODES, severityFor } from '@shared/constants/error-codes.js';
import { firstFieldError, resolveErrorMessage } from '@shared/constants/error-messages.js';
import { HTTP_STATUS } from '@shared/constants/http-status.js';

import { ResolveAccountQuerySchema } from './banks.schema.js';
import * as service from './banks.service.js';

const BANKS_CACHE_CONTROL = 'public, max-age=86400';

export const listBanks: RequestHandler = asyncHandler(async (_req: Request, res: Response) => {
  const r = await service.listBanks();
  const fingerprint = await service.banksFingerprint();
  const etag = fingerprint
    ? `W/"banks-${crypto.createHash('sha256').update(fingerprint).digest('hex').slice(0, 16)}"`
    : null;

  res.setHeader('Cache-Control', BANKS_CACHE_CONTROL);
  if (etag !== null) res.setHeader('ETag', etag);

  if (etag !== null && _req.headers['if-none-match'] === etag) {
    res.status(HTTP_STATUS.NOT_MODIFIED).end();
    return;
  }

  ResponseUtil.ok(res, r.data);
});

export const resolveAccount: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const parsed = ResolveAccountQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    const first = firstFieldError(parsed.error.issues);
    ResponseUtil.error(res, HTTP_STATUS.BAD_REQUEST, {
      errorCode: severityFor(ERROR_CODES.VALIDATION_ERROR),
      errorMessage: first?.message ?? resolveErrorMessage(ERROR_CODES.VALIDATION_ERROR),
      reason: ERROR_CODES.VALIDATION_ERROR,
      ...(first ? { fieldErrors: first.fieldErrors } : {}),
    });
    return;
  }

  const r = await service.resolveAccount(parsed.data);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});
