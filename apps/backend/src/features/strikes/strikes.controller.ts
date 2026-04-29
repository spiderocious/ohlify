import type { Request, Response, RequestHandler } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { bail } from '@lib/http/bail.js';
import { ResponseUtil } from '@lib/response.js';

import type {
  AdminUpholdStrikeDto,
  AdminVoidStrikeDto,
  DisputeStrikeDto,
} from './strikes.schema.js';
import * as service from './strikes.service.js';

export const listMine: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.listMyStrikes(req.query, req.userId!);
  if (!r.success) bail(r);
  else
    ResponseUtil.ok(res, r.data.items, {
      ...r.data.meta,
      summary: r.data.summary,
    });
});

export const getMine: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.getMyStrike(String(req.params['id']), req.userId!);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const dispute: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.disputeStrike(
    String(req.params['id']),
    req.body as DisputeStrikeDto,
    req.userId!,
  );
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const adminList: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.adminListStrikes(req.query);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data.items, r.data.meta);
});

export const adminUphold: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.adminUpholdStrike(
    String(req.params['id']),
    req.body as AdminUpholdStrikeDto,
    req.adminId!,
  );
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const adminVoid: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.adminVoidStrike(
    String(req.params['id']),
    req.body as AdminVoidStrikeDto,
    req.adminId!,
  );
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});
