import type { Request, Response, RequestHandler } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { bail } from '@lib/http/bail.js';
import { ResponseUtil } from '@lib/response.js';

import * as service from './calls.service.js';

export const list: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.listCalls(req.query, req.userId!);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data.items, r.data.meta);
});

export const listHistory: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.listCallHistory(req.query, req.userId!);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data.items, r.data.meta);
});

export const getHistoryItem: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.getCallHistoryItem(String(req.params['id']), req.userId!);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const get: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.getCall(String(req.params['id']), req.userId!);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const join: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.joinCall(String(req.params['id']), req.userId!);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const leave: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.leaveCall(String(req.params['id']), req.userId!);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const renewToken: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.renewToken(String(req.params['id']), req.userId!);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});
