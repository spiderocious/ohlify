import type { Request, Response, RequestHandler } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { ResponseUtil } from '@lib/response.js';

import type { CheckVersionQueryDto, UpsertAppVersionDto } from './app-versions.schema.js';
import * as service from './app-versions.service.js';

export const check: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.checkVersion(req.query as unknown as CheckVersionQueryDto);
  ResponseUtil.ok(res, r.data);
});

export const list: RequestHandler = asyncHandler(async (_req: Request, res: Response) => {
  const r = await service.listVersions();
  ResponseUtil.ok(res, r.data);
});

export const save: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.saveVersion(req.body as UpsertAppVersionDto, req.adminId!);
  ResponseUtil.ok(res, r.data);
});
