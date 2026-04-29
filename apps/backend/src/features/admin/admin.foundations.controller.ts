import type { Request, Response, RequestHandler } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { bail } from '@lib/http/bail.js';
import { ResponseUtil } from '@lib/response.js';

import * as auditService from './admin.audit.service.js';
import * as configService from './admin.config.service.js';
import type { AdminPatchConfigDto } from './admin.write.schema.js';

export const listAuditLog: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await auditService.listAuditLog(req.query);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data.items, r.data.meta);
});

export const getConfig: RequestHandler = asyncHandler(async (_req: Request, res: Response) => {
  const r = await configService.listAllConfig();
  // listAllConfig only ever returns success, but keeping the shape consistent.
  ResponseUtil.ok(res, r.data.items);
});

export const patchConfig: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await configService.patchConfig(req.body as AdminPatchConfigDto, req.adminId!);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});
