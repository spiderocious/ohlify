import type { Request, Response, RequestHandler } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { bail } from '@lib/http/bail.js';
import { ResponseUtil } from '@lib/response.js';

import type {
  AdminApproveRefundDto,
  AdminCreditDto,
  AdminDebitDto,
  AdminForceFailWithdrawalDto,
  AdminRejectRefundDto,
  AdminReplayWebhookDto,
  ManualJournalDto,
} from './admin.write.schema.js';
import * as service from './admin.write.service.js';

export const postManualJournal: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const r = await service.postManualJournalAction(req.body as ManualJournalDto);
    if (!r.success) bail(r);
    else ResponseUtil.created(res, r.data);
  },
);

export const adminCredit: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.adminCreditAction(req.body as AdminCreditDto);
  if (!r.success) bail(r);
  else ResponseUtil.created(res, r.data);
});

export const adminDebit: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.adminDebitAction(req.body as AdminDebitDto);
  if (!r.success) bail(r);
  else ResponseUtil.created(res, r.data);
});

export const listRefunds: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.listRefunds(req.query);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data.items, r.data.meta);
});

export const approveRefund: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.approveRefund(
    String(req.params['id']),
    req.body as AdminApproveRefundDto,
  );
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const rejectRefund: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.rejectRefund(String(req.params['id']), req.body as AdminRejectRefundDto);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const listWithdrawals: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.listWithdrawalsAdmin(req.query);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data.items, r.data.meta);
});

export const forceFailWithdrawal: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const r = await service.forceFailWithdrawal(
      String(req.params['id']),
      req.body as AdminForceFailWithdrawalDto,
    );
    if (!r.success) bail(r);
    else ResponseUtil.ok(res, r.data);
  },
);

export const replayWebhook: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.replayWebhook(req.body as AdminReplayWebhookDto);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});
