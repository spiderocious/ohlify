import type { Request, Response, RequestHandler } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { bail } from '@lib/http/bail.js';
import { ResponseUtil } from '@lib/response.js';

import type { CancelBookingDto, CreateBookingDto } from './bookings.schema.js';
import * as service from './bookings.service.js';

export const create: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const idem = req.header('idempotency-key');
  const r = await service.createBooking({
    dto: req.body as CreateBookingDto,
    userId: req.userId!,
    idempotencyKey: idem ?? null,
  });
  if (!r.success) bail(r);
  else ResponseUtil.created(res, r.data);
});

export const list: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.listBookings(req.query, req.userId!);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data.items, r.data.meta);
});

export const get: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.getBooking(String(req.params['id']), req.userId!);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const cancel: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.cancelBooking(
    String(req.params['id']),
    req.body as CancelBookingDto,
    req.userId!,
  );
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});
