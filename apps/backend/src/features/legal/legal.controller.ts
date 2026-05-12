import crypto from 'node:crypto';

import type { Request, Response, RequestHandler } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { bail } from '@lib/http/bail.js';
import { ResponseUtil } from '@lib/response.js';
import { HTTP_STATUS } from '@shared/constants/http-status.js';

import * as service from './legal.service.js';
import { LegalKind } from './legal.types.js';

const LEGAL_CACHE_CONTROL = 'public, max-age=86400';

const handlerFor = (kind: LegalKind): RequestHandler =>
  asyncHandler(async (req: Request, res: Response) => {
    const fp = await service.fingerprintForKind(kind);
    const etag = fp
      ? `W/"legal-${kind}-${crypto.createHash('sha256').update(fp).digest('hex').slice(0, 16)}"`
      : null;

    res.setHeader('Cache-Control', LEGAL_CACHE_CONTROL);
    if (etag !== null) res.setHeader('ETag', etag);

    if (etag !== null && req.headers['if-none-match'] === etag) {
      res.status(HTTP_STATUS.NOT_MODIFIED).end();
      return;
    }

    const r = await service.getByKind(kind);
    if (!r.success) bail(r);
    else ResponseUtil.ok(res, r.data);
  });

export const getEula: RequestHandler = handlerFor(LegalKind.EULA);
export const getPrivacy: RequestHandler = handlerFor(LegalKind.PRIVACY);
export const getTerms: RequestHandler = handlerFor(LegalKind.TERMS);
