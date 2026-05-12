import type { Request, Response, RequestHandler } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { bail } from '@lib/http/bail.js';
import { ResponseUtil } from '@lib/response.js';

import * as service from './admin.content.service.js';
import type {
  AdminCreateFaqDto,
  AdminPublishLegalDto,
  AdminUpdateFaqDto,
} from './admin.write.schema.js';

// ── Legal ────────────────────────────────────────────────────────────────

export const listLegal: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.listLegal(String(req.params['kind']));
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const publishLegal: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.publishLegal(
    String(req.params['kind']),
    req.body as AdminPublishLegalDto,
  );
  if (!r.success) bail(r);
  else ResponseUtil.created(res, r.data);
});

// ── FAQs ──────────────────────────────────────────────────────────────────

export const listFaqs: RequestHandler = asyncHandler(async (_req: Request, res: Response) => {
  const r = await service.listFaqs();
  ResponseUtil.ok(res, r.data.items);
});

export const createFaq: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.createFaq(req.body as AdminCreateFaqDto);
  ResponseUtil.created(res, r.data);
});

export const updateFaq: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.updateFaq(String(req.params['id']), req.body as AdminUpdateFaqDto);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const deleteFaq: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.deleteFaq(String(req.params['id']));
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});
