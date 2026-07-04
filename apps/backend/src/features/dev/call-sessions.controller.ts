import type { Request, Response, RequestHandler } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { bail } from '@lib/http/bail.js';
import { ResponseUtil } from '@lib/response.js';

import type { CreateCallSessionDto } from './call-sessions.schema.js';
import * as service from './call-sessions.service.js';

export const create: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.createSession(req.body as CreateCallSessionDto);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const getParty: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.getParty(String(req.params['session_id']), String(req.params['party']));
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});
