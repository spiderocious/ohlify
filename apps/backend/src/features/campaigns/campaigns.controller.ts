import type { Request, Response, RequestHandler } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { bail } from '@lib/http/bail.js';
import { ResponseUtil } from '@lib/response.js';

import type { CreateCampaignDto } from './campaigns.schema.js';
import * as service from './campaigns.service.js';

export const create: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.createCampaign(req.body as CreateCampaignDto, req.adminId!);
  ResponseUtil.created(res, r.data);
});

export const list: RequestHandler = asyncHandler(async (_req: Request, res: Response) => {
  const r = await service.listCampaigns(50);
  ResponseUtil.ok(res, r.data);
});

export const schedule: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.scheduleCampaign(String(req.params['id']));
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const cancel: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.cancelCampaign(String(req.params['id']));
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});
