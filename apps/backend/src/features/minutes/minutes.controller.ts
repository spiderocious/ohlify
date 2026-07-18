import type { Request, Response, RequestHandler } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { bail } from '@lib/http/bail.js';
import { ResponseUtil } from '@lib/response.js';

import type { CallType } from '@features/bookings/bookings.types.js';

import type { BuyMinutesDto } from './minutes.schema.js';
import * as service from './minutes.service.js';

export const listMine: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.listMyBalances(req.userId!);
  ResponseUtil.ok(res, r.data);
});

export const getForPro: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  // Validated by BalanceQuerySchema on the route — both are guaranteed strings.
  const q = req.query as { professional_id: string; call_type: CallType };
  const r = await service.getBalanceForPro(req.userId!, q.professional_id, q.call_type);
  ResponseUtil.ok(res, r.data);
});

export const buy: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.purchase(req.body as BuyMinutesDto, req.userId!);
  if (!r.success) bail(r);
  else ResponseUtil.created(res, r.data);
});
