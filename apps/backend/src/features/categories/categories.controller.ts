import crypto from 'node:crypto';

import type { Request, Response, RequestHandler } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { ResponseUtil } from '@lib/response.js';
import { HTTP_STATUS } from '@shared/constants/http-status.js';

import * as service from './categories.service.js';

const CACHE_CONTROL = 'public, max-age=86400';

export const list: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const fp = await service.fingerprint();
  const etag = `W/"cats-${crypto.createHash('sha256').update(fp).digest('hex').slice(0, 16)}"`;

  res.setHeader('Cache-Control', CACHE_CONTROL);
  res.setHeader('ETag', etag);

  if (req.headers['if-none-match'] === etag) {
    res.status(HTTP_STATUS.NOT_MODIFIED).end();
    return;
  }

  const r = await service.listAll();
  ResponseUtil.ok(res, r.data);
});
