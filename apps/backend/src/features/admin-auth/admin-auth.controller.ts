import type { Request, Response, RequestHandler } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { bail } from '@lib/http/bail.js';
import { ResponseUtil } from '@lib/response.js';

import type {
  AdminLoginDto,
  AdminLogoutDto,
  AdminRefreshDto,
  AdminTotpConfirmDto,
  AdminTotpSetupDto,
} from './admin-auth.schema.js';
import * as service from './admin-auth.service.js';

export const login: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.login({
    dto: req.body as AdminLoginDto,
    userAgent: req.header('user-agent') ?? null,
    ipAddress: req.ip ?? null,
  });
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const refresh: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.refresh(req.body as AdminRefreshDto);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const logout: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  // logout always succeeds (idempotent — revokes session if found, no-op otherwise).
  const r = await service.logout(req.body as AdminLogoutDto);
  ResponseUtil.ok(res, r.data);
});

export const totpSetup: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.totpSetup(req.adminId!, req.body as AdminTotpSetupDto);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const totpConfirm: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.totpConfirm(req.adminId!, req.body as AdminTotpConfirmDto);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const bootstrap: RequestHandler = asyncHandler(async (_req: Request, res: Response) => {
  const r = await service.bootstrap();
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});
