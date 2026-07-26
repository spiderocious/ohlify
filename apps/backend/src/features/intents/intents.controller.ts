import type { Request, Response, RequestHandler } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { bail } from '@lib/http/bail.js';
import { ResponseUtil } from '@lib/response.js';

import type { CreateIntentDto } from './intents.schema.js';
import * as service from './intents.service.js';

export const create: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.createIntent(req.body as CreateIntentDto, req.userId!);
  if (!r.success) bail(r);
  else ResponseUtil.created(res, r.data);
});

export const get: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.getIntent(String(req.params['ref']), req.userId!);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const verify: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.verifyIntent(String(req.params['ref']), req.userId!);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const cancel: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.cancelIntent(String(req.params['ref']), req.userId!);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});
