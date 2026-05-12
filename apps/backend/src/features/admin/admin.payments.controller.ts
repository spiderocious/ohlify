import type { Request, Response, RequestHandler } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { bail } from '@lib/http/bail.js';
import { ResponseUtil } from '@lib/response.js';

import * as service from './admin.payments.service.js';
import type { AdminApproveWithdrawalDto, AdminRejectWithdrawalDto } from './admin.write.schema.js';

export const listTransactions: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const r = await service.listTransactions(req.query);
    if (!r.success) bail(r);
    else ResponseUtil.ok(res, r.data.items, r.data.meta);
  },
);

export const getTransaction: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.getTransactionDetail(String(req.params['id']));
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const approveWithdrawal: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const r = await service.approveWithdrawal(
      String(req.params['id']),
      req.body as AdminApproveWithdrawalDto,
    );
    if (!r.success) bail(r);
    else ResponseUtil.ok(res, r.data);
  },
);

export const rejectWithdrawal: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const r = await service.rejectWithdrawal(
      String(req.params['id']),
      req.body as AdminRejectWithdrawalDto,
    );
    if (!r.success) bail(r);
    else ResponseUtil.ok(res, r.data);
  },
);

export const syncPayouts: RequestHandler = asyncHandler(async (_req: Request, res: Response) => {
  const r = await service.syncPayouts();
  ResponseUtil.ok(res, r.data);
});
