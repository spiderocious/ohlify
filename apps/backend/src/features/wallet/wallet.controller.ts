import type { Request, Response, RequestHandler } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { bail } from '@lib/http/bail.js';
import { ResponseUtil } from '@lib/response.js';

import type { InitializeFundingDto, VerifyFundingDto } from './wallet.schema.js';
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
