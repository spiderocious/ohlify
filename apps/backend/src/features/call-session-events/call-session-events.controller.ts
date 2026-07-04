import type { Request, Response, RequestHandler } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { bail } from '@lib/http/bail.js';
import { ResponseUtil } from '@lib/response.js';

import type { IngestEventDto } from './call-session-events.schema.js';
import * as service from './call-session-events.service.js';

export const ingest: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const callId = String(req.params['call_id']);
  const r = await service.ingestEvent(callId, req.body as IngestEventDto);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const list: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const callId = String(req.params['call_id']);
  const r = await service.listEvents(
    callId,
    req.query as unknown as Parameters<typeof service.listEvents>[1],
  );
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const listByReference: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const ref = String(req.params['reference']);
  const r = await service.listEventsByReference(
    ref,
    req.query as unknown as Parameters<typeof service.listEventsByReference>[1],
  );
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const summary: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const callId = String(req.params['call_id']);
  const r = await service.getSummary(callId);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});
