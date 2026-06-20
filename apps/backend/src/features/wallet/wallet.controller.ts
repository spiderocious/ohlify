import type { Request, Response, RequestHandler } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { bail } from '@lib/http/bail.js';
import { ResponseUtil } from '@lib/response.js';
import { ERROR_CODES, severityFor } from '@shared/constants/error-codes.js';
import { resolveErrorMessage } from '@shared/constants/error-messages.js';
import { HTTP_STATUS } from '@shared/constants/http-status.js';

import type {
  InitializeFundingDto,
  PayFromWalletDto,
  RequestWithdrawalDto,
  VerifyFundingDto,
} from './wallet.schema.js';
import * as service from './wallet.service.js';

export const getSummary: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.getSummary(req.userId!);
  ResponseUtil.ok(res, r.data);
});

export const getStats: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.getStats(req.userId!);
  ResponseUtil.ok(res, r.data);
});

export const listTransactions: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const r = await service.listTransactions(req.query, req.userId!);
    if (!r.success) bail(r);
    else ResponseUtil.ok(res, r.data.items, r.data.meta);
  },
);

export const initializeFunding: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const r = await service.initializeFunding(req.body as InitializeFundingDto, req.userId!);
    if (!r.success) bail(r);
    else ResponseUtil.created(res, r.data);
  },
);

export const verifyFunding: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.verifyFunding(req.body as VerifyFundingDto, req.userId!);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const pay: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.payFromWallet(req.body as PayFromWalletDto, req.userId!);
  if (!r.success) {
    bail(r);
    return;
  }
  if (r.data.status === 'insufficient_balance') {
    ResponseUtil.error(res, HTTP_STATUS.CONFLICT, {
      errorCode: severityFor(ERROR_CODES.INSUFFICIENT_BALANCE),
      errorMessage: resolveErrorMessage(ERROR_CODES.INSUFFICIENT_BALANCE),
      reason: ERROR_CODES.INSUFFICIENT_BALANCE,
    });
    return;
  }
  ResponseUtil.ok(res, r.data);
});

export const requestWithdrawal: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const idem = req.header('idempotency-key');
    const r = await service.requestWithdrawal({
      dto: req.body as RequestWithdrawalDto,
      userId: req.userId!,
      idempotencyKey: idem ?? null,
    });
    if (!r.success) bail(r);
    else ResponseUtil.created(res, r.data);
  },
);

export const listWithdrawals: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.listWithdrawals(req.query, req.userId!);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data.items, r.data.meta);
});

export const getWithdrawal: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.getWithdrawal(String(req.params['id']), req.userId!);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});
