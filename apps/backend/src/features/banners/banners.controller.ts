import type { Request, Response, RequestHandler } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { bail } from '@lib/http/bail.js';
import { ResponseUtil } from '@lib/response.js';

import type { CreateBannerDto, UpdateBannerDto } from './banners.schema.js';
import * as service from './banners.service.js';

export const adminCreate: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.createBanner(req.body as CreateBannerDto, req.adminId!);
  if (!r.success) bail(r);
  else ResponseUtil.created(res, r.data);
});

export const adminUpdate: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.updateBanner(String(req.params['id']), req.body as UpdateBannerDto);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const adminDelete: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.deleteBanner(String(req.params['id']));
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const adminLaunch: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.launchBanner(String(req.params['id']));
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const adminPause: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.pauseBanner(String(req.params['id']));
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const adminList: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.listAdmin(req.query);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data.items, r.data.meta);
});

export const adminGet: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.getAdmin(String(req.params['id']));
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const publicList: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.listPublic(req.query);
  ResponseUtil.ok(res, r.data.items);
});
