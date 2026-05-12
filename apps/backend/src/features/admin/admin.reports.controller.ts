import type { Request, Response, RequestHandler } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { bail } from '@lib/http/bail.js';
import { ResponseUtil } from '@lib/response.js';

import * as service from './admin.reports.service.js';
import type { AdminDismissReportDto, AdminResolveReportDto } from './admin.write.schema.js';

export const list: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.listReports(req.query);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data.items, r.data.meta);
});

export const resolve: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.resolveReport(
    String(req.params['id']),
    req.body as AdminResolveReportDto,
    req.adminId!,
  );
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const dismiss: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.dismissReport(
    String(req.params['id']),
    req.body as AdminDismissReportDto,
    req.adminId!,
  );
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});
