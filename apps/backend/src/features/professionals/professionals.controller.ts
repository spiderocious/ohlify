import type { Request, Response, RequestHandler } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { bail } from '@lib/http/bail.js';
import { ResponseUtil } from '@lib/response.js';

import * as service from './professionals.service.js';

export const list: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  // Schema validation runs upstream (validate(..., 'query')); req.query is the
  // parsed shape at this point.
  const r = await service.list(req.query);
  if (!r.success) bail(r);
  else
    ResponseUtil.ok(res, r.data.items, {
      next_cursor: r.data.meta.next_cursor,
      has_more: r.data.meta.has_more,
    });
});

export const detail: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.detail(String(req.params['id']));
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const rates: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.rates(String(req.params['id']));
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const reviews: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.reviews(String(req.params['id']), req.query);
  if (!r.success) bail(r);
  else
    ResponseUtil.ok(res, r.data.items, {
      next_cursor: r.data.meta.next_cursor,
      has_more: r.data.meta.has_more,
    });
});

export const availability: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.availability(String(req.params['id']), req.query);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const home: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.home(req.userId!);
  ResponseUtil.ok(res, r.data);
});
