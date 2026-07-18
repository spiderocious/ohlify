import type { Request, Response, RequestHandler } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { bail } from '@lib/http/bail.js';
import { ResponseUtil } from '@lib/response.js';

import type { EndCallDto, StartCallDto } from './instant-calls.schema.js';
import * as service from './instant-calls.service.js';

export const start: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.startCall(req.body as StartCallDto, req.userId!);
  if (!r.success) bail(r);
  else ResponseUtil.created(res, r.data);
});

export const answer: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.answerCall(String(req.params['id']), req.userId!);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const incoming: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.getIncoming(req.userId!);
  ResponseUtil.ok(res, r.data);
});

export const end: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const dto = req.body as EndCallDto;
  const r = await service.endCall(String(req.params['id']), req.userId!, dto.connected_seconds);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});
