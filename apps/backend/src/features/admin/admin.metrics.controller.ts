import type { Request, Response, RequestHandler } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { ResponseUtil } from '@lib/response.js';

import * as service from './admin.metrics.service.js';

export const overview: RequestHandler = asyncHandler(async (_req: Request, res: Response) => {
  const r = await service.overview();
  ResponseUtil.ok(res, r.data);
});

export const revenue: RequestHandler = asyncHandler(async (_req: Request, res: Response) => {
  const r = await service.revenue();
  ResponseUtil.ok(res, r.data);
});

export const cohorts: RequestHandler = asyncHandler(async (_req: Request, res: Response) => {
  const r = await service.cohorts();
  ResponseUtil.ok(res, r.data);
});
