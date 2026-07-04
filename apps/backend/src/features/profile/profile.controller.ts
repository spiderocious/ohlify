import type { Request, Response, RequestHandler } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { bail } from '@lib/http/bail.js';
import { ResponseUtil } from '@lib/response.js';
import { HTTP_STATUS } from '@shared/constants/http-status.js';

import * as bookingBlocksService from './booking-blocks.service.js';
import * as deviceTokensService from './device-tokens.service.js';
import type {
  ChangeEmailDto,
  ChangePhoneDto,
  DeleteAccountDto,
  DeleteDeviceTokenDto,
  NotificationPreferencesPatchDto,
  PatchMeDto,
  PostAvatarDto,
  PutBankAccountDto,
  PutBookingBlocksDto,
  RegisterDeviceTokenDto,
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

export const getBookingBlocks: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const r = await bookingBlocksService.list(req.userId!);
    ResponseUtil.ok(res, r.data);
  },
);

export const putBookingBlocks: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const r = await bookingBlocksService.replace(req.body as PutBookingBlocksDto, req.userId!);
    if (!r.success) bail(r);
    else ResponseUtil.ok(res, r.data);
  },
);

export const registerDeviceToken: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const r = await deviceTokensService.register(req.body as RegisterDeviceTokenDto, req.userId!);
    ResponseUtil.ok(res, r.data);
  },
);

export const deleteDeviceToken: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const r = await deviceTokensService.unregister(req.body as DeleteDeviceTokenDto, req.userId!);
    ResponseUtil.ok(res, r.data);
  },
);
