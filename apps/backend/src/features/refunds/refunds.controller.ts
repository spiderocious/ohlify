import type { Request, Response, RequestHandler } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { bail } from '@lib/http/bail.js';
import { ResponseUtil } from '@lib/response.js';

import type {
  ApproveRefundDto,
  CreateRefundRequestDto,
  RejectRefundDto,
} from './refunds.schema.js';
import * as service from './refunds.service.js';

export const create: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.createRefundRequest(req.body as CreateRefundRequestDto, req.userId!);
  if (!r.success) bail(r);
  else ResponseUtil.created(res, r.data);
});

export const list: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.listRefundRequests(req.query, req.userId!);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data.items, r.data.meta);
});

export const get: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.getRefundRequest(String(req.params['id']), req.userId!);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

// Admin handlers — assume requireAdmin middleware has run upstream. The
// adminId comes from the X-Admin-Token stub for now (no per-admin identity);
// once §21 ships, swap to req.adminId.
const STUB_ADMIN_ID = 'adm_stub';

export const adminApprove: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.approveRefund({
    refundId: String(req.params['id']),
    adminId: STUB_ADMIN_ID,
    dto: req.body as ApproveRefundDto,
  });
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const adminReject: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.rejectRefund({
    refundId: String(req.params['id']),
    adminId: STUB_ADMIN_ID,
    dto: req.body as RejectRefundDto,
  });
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const adminList: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.adminListRefunds(req.query);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data.items, r.data.meta);
});
