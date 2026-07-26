import type { Request, Response, RequestHandler } from 'express';

import { ValidationError } from '@lib/errors.js';
import { asyncHandler } from '@lib/http/asyncHandler.js';
import { bail } from '@lib/http/bail.js';
import { ResponseUtil } from '@lib/response.js';

import type { ListNotificationsQueryDto } from './notifications.schema.js';
import { SurfaceParamSchema } from './notifications.schema.js';
import * as service from './notifications.service.js';

export const list: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as unknown as ListNotificationsQueryDto;
  const r = await service.listMine(req.userId!, q.limit, q.cursor);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const markRead: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.markRead(req.userId!, String(req.params['id']));
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const markAllRead: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.markAllRead(req.userId!);
  ResponseUtil.ok(res, r.data);
});

export const badges: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.getBadges(req.userId!);
  ResponseUtil.ok(res, r.data);
});

export const markSurfaceSeen: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const parsed = SurfaceParamSchema.safeParse(req.params['surface']);
  if (!parsed.success) {
    throw new ValidationError('Unknown surface', {
      surface: ['Must be one of: calls, wallet, chats, notifications'],
    });
  }
  const r = await service.markSurfaceSeen(req.userId!, parsed.data);
  ResponseUtil.ok(res, r.data);
});
