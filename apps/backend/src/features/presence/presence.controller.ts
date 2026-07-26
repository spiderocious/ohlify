import type { Request, Response, RequestHandler } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { ResponseUtil } from '@lib/response.js';

import * as service from './presence.service.js';

// Whether a professional can take a call right now. Auth required — callers
// have to be logged in to see this before dialling.
export const getForPro: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const professionalId = String(req.params['id']);
  const r = await service.getPresence(professionalId);
  ResponseUtil.ok(res, r.data);
});
