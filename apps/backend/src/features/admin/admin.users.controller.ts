import type { Request, Response, RequestHandler } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { bail } from '@lib/http/bail.js';
import { ResponseUtil } from '@lib/response.js';

import * as service from './admin.users.service.js';
import type {
  AdminBlockUserDto,
  AdminImpersonateUserDto,
  AdminResetPasswordDto,
  AdminSuspendUserDto,
  AdminUnsuspendUserDto,
} from './admin.write.schema.js';

export const list: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.listUsers(req.query);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data.items, r.data.meta);
});

export const get: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.getUser(String(req.params['id']));
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const suspend: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.suspendUser(String(req.params['id']), req.body as AdminSuspendUserDto);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const unsuspend: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.unsuspendUser(
    String(req.params['id']),
    req.body as AdminUnsuspendUserDto,
  );
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const block: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.blockUser(String(req.params['id']), req.body as AdminBlockUserDto);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const unblock: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.unblockUser(String(req.params['id']), req.body as AdminUnsuspendUserDto);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const resetPassword: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.resetPassword(
    String(req.params['id']),
    req.body as AdminResetPasswordDto,
    req.adminId!,
  );
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const impersonate: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.impersonateUser(
    String(req.params['id']),
    req.body as AdminImpersonateUserDto,
  );
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});
