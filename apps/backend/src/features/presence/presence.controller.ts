import type { Request, Response, RequestHandler } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { ResponseUtil } from '@lib/response.js';

import * as service from './presence.service.js';

// Pro heartbeat — bumps last_seen_at. Called periodically by an online pro's
// client so instant-call preflight can tell they're reachable.
export const heartbeat: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.heartbeat(req.userId!);
  ResponseUtil.ok(res, r.data);
});

// Public-ish presence read for a professional (auth required — callers must be
// logged in to see whether a pro is reachable before dialling).
export const getForPro: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const professionalId = String(req.params['id']);
  const r = await service.getPresence(professionalId);
  ResponseUtil.ok(res, r.data);
});
