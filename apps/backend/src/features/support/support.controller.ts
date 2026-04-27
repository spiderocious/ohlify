import crypto from 'node:crypto';

import type { Request, Response, RequestHandler } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { ResponseUtil } from '@lib/response.js';
import { HTTP_STATUS } from '@shared/constants/http-status.js';

import type { CreateTicketDto } from './support.schema.js';
import * as service from './support.service.js';

const FAQ_CACHE_CONTROL = 'public, max-age=3600';
const CONTACT_CACHE_CONTROL = 'public, max-age=3600';

export const listFaqs: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const fp = await service.fingerprintFaqs();
  const etag = fp
    ? `W/"faqs-${crypto.createHash('sha256').update(fp).digest('hex').slice(0, 16)}"`
    : null;

  res.setHeader('Cache-Control', FAQ_CACHE_CONTROL);
  if (etag !== null) res.setHeader('ETag', etag);

  if (etag !== null && req.headers['if-none-match'] === etag) {
    res.status(HTTP_STATUS.NOT_MODIFIED).end();
    return;
  }

  const r = await service.listFaqs();
  ResponseUtil.ok(res, r.data);
});

export const getContact: RequestHandler = (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', CONTACT_CACHE_CONTROL);
  const r = service.getContact();
  ResponseUtil.ok(res, r.data);
};

export const createTicket: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.createTicket(req.body as CreateTicketDto, req.userId!);
  ResponseUtil.created(res, r.data);
});
