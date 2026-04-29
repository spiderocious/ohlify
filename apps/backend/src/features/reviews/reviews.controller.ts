import type { Request, Response, RequestHandler } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { bail } from '@lib/http/bail.js';
import { ResponseUtil } from '@lib/response.js';

import type { AdminHideReviewDto, PostRatingDto } from './reviews.schema.js';
import * as service from './reviews.service.js';

export const postRating: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.postRating(
    String(req.params['id']),
    req.body as PostRatingDto,
    req.userId!,
  );
  if (!r.success) bail(r);
  else ResponseUtil.created(res, r.data);
});

export const listForProfessional: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const r = await service.listForProfessional(String(req.params['id']), req.query);
    if (!r.success) bail(r);
    else ResponseUtil.ok(res, r.data.items, r.data.meta);
  },
);

export const listGiven: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.listGiven(req.query, req.userId!);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data.items, r.data.meta);
});

// ── Admin ────────────────────────────────────────────────────────────────────

export const adminList: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.adminListReviews(req.query);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data.items, r.data.meta);
});

export const adminHide: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.adminHideReview({
    reviewId: String(req.params['id']),
    adminId: req.adminId!,
    dto: req.body as AdminHideReviewDto,
  });
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});
