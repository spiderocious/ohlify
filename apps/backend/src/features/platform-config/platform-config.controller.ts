import type { Request, Response, RequestHandler } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { ResponseUtil } from '@lib/response.js';

import * as service from './platform-config.service.js';

const PUBLIC_CACHE_CONTROL = 'public, max-age=300, s-maxage=300';

export const getPublic: RequestHandler = asyncHandler(async (_req: Request, res: Response) => {
  const r = await service.getPublicConfig();
  res.setHeader('Cache-Control', PUBLIC_CACHE_CONTROL);
  ResponseUtil.ok(res, r.data);
});
