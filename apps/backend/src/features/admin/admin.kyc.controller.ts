import type { Request, Response, RequestHandler } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { bail } from '@lib/http/bail.js';
import { ResponseUtil } from '@lib/response.js';

import * as service from './admin.kyc.service.js';
import type { AdminApproveKycDto, AdminRejectKycDto } from './admin.write.schema.js';

export const list: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.listSubmissions(req.query);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data.items, r.data.meta);
});

export const approve: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.approve(
    String(req.params['id']),
    req.body as AdminApproveKycDto,
    req.adminId!,
  );
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const reject: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.reject(
    String(req.params['id']),
    req.body as AdminRejectKycDto,
    req.adminId!,
  );
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});
