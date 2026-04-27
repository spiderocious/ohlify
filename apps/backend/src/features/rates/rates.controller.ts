import type { Request, Response, RequestHandler } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { bail } from '@lib/http/bail.js';
import { ResponseUtil } from '@lib/response.js';
import { HTTP_STATUS } from '@shared/constants/http-status.js';

import type { CreateRateDto, UpdateRateDto } from './rates.schema.js';
import * as service from './rates.service.js';

export const listMine: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.listMine(req.userId!);
  ResponseUtil.ok(res, r.data);
});

export const create: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.create(req.body as CreateRateDto, req.userId!);
  if (!r.success) bail(r);
  else ResponseUtil.created(res, r.data);
});

export const update: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.update(String(req.params['id']), req.body as UpdateRateDto, req.userId!);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const remove: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.remove(String(req.params['id']), req.userId!);
  if (!r.success) bail(r);
  else res.status(HTTP_STATUS.NO_CONTENT).end();
});
