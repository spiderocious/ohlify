import type { Request, Response, RequestHandler } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { ResponseUtil } from '@lib/response.js';

import * as dashboardService from './admin.dashboard.service.js';
import * as technicalService from './admin.technical.service.js';
import type { AdminDashboardQueryDto } from './admin.schema.js';

/**
 * Both handlers omit the `bail` unwrap that write controllers use, matching
 * `admin.metrics.controller`: these services aggregate read-only queries and
 * have no failure branch to unwrap. A genuine fault (the pool being down)
 * throws and is caught by `asyncHandler`, which is the right outcome — a
 * dashboard that renders zeroes because the database was unreachable is worse
 * than one that shows an error.
 */

export const overview: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const { range } = req.query as unknown as AdminDashboardQueryDto;
  // The role decides whether money is in the payload at all — see the service.
  const r = await dashboardService.overview(range, req.adminRole);
  ResponseUtil.ok(res, r.data);
});

export const technical: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const { range } = req.query as unknown as AdminDashboardQueryDto;
  const r = await technicalService.technical(range);
  ResponseUtil.ok(res, r.data);
});
