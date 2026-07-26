import type { Request, Response, RequestHandler } from 'express';

import { ValidationError } from '@lib/errors.js';
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

/** The single banner for this user on a screen. */
export const resolve: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  // Express types a query value as string | string[] | object, so anything
  // that is not a plain string is a malformed request rather than a placement.
  const raw = req.query['placement'];
  const placement = typeof raw === 'string' ? raw : '';
  if (!placement) {
    throw new ValidationError('Missing placement', {
      placement: ['Specify which screen the banner is for'],
    });
  }
  const r = await service.resolveForUser(req.userId!, placement);
  ResponseUtil.ok(res, r.data);
});

export const markSeen: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.markSeen(req.userId!, String(req.params['id']));
  ResponseUtil.ok(res, r.data);
});

export const previewAudience: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.previewAudience(req.body as Record<string, never>);
  ResponseUtil.ok(res, r.data);
});
