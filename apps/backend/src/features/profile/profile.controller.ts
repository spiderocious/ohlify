import type { Request, Response, RequestHandler } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { bail } from '@lib/http/bail.js';
import { ResponseUtil } from '@lib/response.js';
import { HTTP_STATUS } from '@shared/constants/http-status.js';

import type {
  ChangeEmailDto,
  ChangePhoneDto,
  DeleteAccountDto,
  NotificationPreferencesPatchDto,
  PatchMeDto,
  PostAvatarDto,
  PutBankAccountDto,
  VerifyOtpOnlyDto,
} from './profile.schema.js';
import * as service from './profile.service.js';

export const getMe: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.getMe(req.userId!);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const patchMe: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.patchMe(req.body as PatchMeDto, req.userId!);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const changeEmail: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.changeEmail(req.body as ChangeEmailDto, req.userId!);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const verifyEmail: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.verifyEmail(req.body as VerifyOtpOnlyDto, req.userId!);
  if (!r.success) bail(r);
  else res.status(HTTP_STATUS.NO_CONTENT).end();
});

export const changePhone: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.changePhone(req.body as ChangePhoneDto, req.userId!);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const verifyPhone: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.verifyPhone(req.body as VerifyOtpOnlyDto, req.userId!);
  if (!r.success) bail(r);
  else res.status(HTTP_STATUS.NO_CONTENT).end();
});

export const deleteAccount: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.deleteAccount(req.body as DeleteAccountDto, req.userId!);
  if (!r.success) bail(r);
  else res.status(HTTP_STATUS.ACCEPTED).json({ data: r.data });
});

export const getPreferences: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.getPreferences(req.userId!);
  ResponseUtil.ok(res, r.data);
});

export const patchPreferences: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const r = await service.patchPreferences(
      req.body as NotificationPreferencesPatchDto,
      req.userId!,
    );
    ResponseUtil.ok(res, r.data);
  },
);

export const getBankAccount: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.getBankAccount(req.userId!);
  ResponseUtil.ok(res, r.data);
});

export const putBankAccount: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.putBankAccount(req.body as PutBankAccountDto, req.userId!);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const deleteBankAccount: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    await service.deleteBankAccount(req.userId!);
    res.status(HTTP_STATUS.NO_CONTENT).end();
  },
);

export const setAvatar: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.setAvatar(req.body as PostAvatarDto, req.userId!);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const removeAvatar: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  await service.removeAvatar(req.userId!);
  res.status(HTTP_STATUS.NO_CONTENT).end();
});
