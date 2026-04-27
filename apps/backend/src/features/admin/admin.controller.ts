import type { Request, Response, RequestHandler } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { bail } from '@lib/http/bail.js';
import { ResponseUtil } from '@lib/response.js';

import type {
  ListAccountsQueryDto,
  ListWebhooksQueryDto,
  SummaryWindowQueryDto,
} from './admin.schema.js';
import * as service from './admin.service.js';

export const getUserWallet: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.getUserWallet(String(req.params['userId']));
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const listAccounts: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as unknown as ListAccountsQueryDto;
  const r = await service.listAccounts(q.kind ?? 'all');
  ResponseUtil.ok(res, r.data);
});

export const getSystemAccount: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const r = await service.getSystemAccount(String(req.params['code']));
    if (!r.success) bail(r);
    else ResponseUtil.ok(res, r.data);
  },
);

export const listJournals: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.listJournals(req.query);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data.items, r.data.meta);
});

export const getJournal: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.getJournal(String(req.params['id']));
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const runReconciliation: RequestHandler = asyncHandler(
  async (_req: Request, res: Response) => {
    const r = await service.runReconciliation();
    ResponseUtil.ok(res, r.data);
  },
);

export const listWebhooks: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as unknown as ListWebhooksQueryDto;
  const r = await service.listWebhooks(q.limit ?? 50);
  ResponseUtil.ok(res, r.data);
});

const parseWindow = (q: SummaryWindowQueryDto): { from: Date | null; to: Date | null } => ({
  from: q.from ? new Date(`${q.from}T00:00:00.000Z`) : null,
  to: q.to ? new Date(`${q.to}T00:00:00.000Z`) : null,
});

export const getPaystackFeesSummary: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { from, to } = parseWindow(req.query);
    const r = await service.getPaystackFeesSummary(from, to);
    ResponseUtil.ok(res, r.data);
  },
);

export const getPlatformRevenueSummary: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { from, to } = parseWindow(req.query);
    const r = await service.getPlatformRevenueSummary(from, to);
    ResponseUtil.ok(res, r.data);
  },
);
