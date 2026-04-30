import type { Request, Response, RequestHandler } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { ResponseUtil } from '@lib/response.js';

import * as service from './admin.metrics.service.js';
import type { AdminMetricsRevenueQueryDto } from './admin.write.schema.js';

export const overview: RequestHandler = asyncHandler(async (_req: Request, res: Response) => {
  const r = await service.overview();
  ResponseUtil.ok(res, r.data);
});

export const revenue: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as unknown as AdminMetricsRevenueQueryDto;
  const r = await service.revenue({
    ...(q.from ? { from: new Date(q.from) } : {}),
    ...(q.to ? { to: new Date(q.to) } : {}),
    ...(q.granularity ? { granularity: q.granularity } : {}),
  });
  ResponseUtil.ok(res, r.data);
});

export const cohorts: RequestHandler = asyncHandler(async (_req: Request, res: Response) => {
  const r = await service.cohorts();
  ResponseUtil.ok(res, r.data);
});
