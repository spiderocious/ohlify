import type { Request, Response, RequestHandler } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { bail } from '@lib/http/bail.js';
import { ResponseUtil } from '@lib/response.js';

import type {
  ChangePasswordDto,
  ForgotPasswordInitiateDto,
  ForgotPasswordResetDto,
  ForgotPasswordVerifyOtpDto,
  LoginDto,
  LogoutDto,
  RefreshDto,
  RegisterInitiateDto,
  RegisterSetPasswordDto,
  RegisterVerifyDto,
  ResendOtpDto,
  SensitiveActionOtpDto,
} from './auth.schema.js';
import * as service from './auth.service.js';

export const registerInitiate: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const r = await service.registerInitiate(req.body as RegisterInitiateDto);
    if (!r.success) bail(r);
    else ResponseUtil.created(res, r.data);
  },
);

export const registerSetPassword: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const r = await service.registerSetPassword(req.body as RegisterSetPasswordDto);
    if (!r.success) bail(r);
    else ResponseUtil.ok(res, r.data);
  },
);

export const registerVerify: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.registerVerify(req.body as RegisterVerifyDto, meta(req));
  if (!r.success) bail(r);
  else ResponseUtil.created(res, r.data);
});

export const resendOtp: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.resendOtp(req.body as ResendOtpDto);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const login: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.login(req.body as LoginDto, meta(req));
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const refresh: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.refresh(req.body as RefreshDto, meta(req));
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const logout: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.logout(req.body as LogoutDto, req.userId!);
  ResponseUtil.ok(res, r.data);
});

export const forgotPasswordInitiate: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const r = await service.forgotPasswordInitiate(req.body as ForgotPasswordInitiateDto);
    ResponseUtil.ok(res, r.data);
  },
);

export const forgotPasswordVerifyOtp: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const r = await service.forgotPasswordVerifyOtp(req.body as ForgotPasswordVerifyOtpDto);
    if (!r.success) bail(r);
    else ResponseUtil.ok(res, r.data);
  },
);

export const forgotPasswordReset: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const r = await service.forgotPasswordReset(req.body as ForgotPasswordResetDto);
    if (!r.success) bail(r);
    else ResponseUtil.ok(res, r.data);
  },
);

export const changePassword: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.changePassword(req.body as ChangePasswordDto, req.userId!);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const requestSensitiveActionOtp: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const r = await service.requestSensitiveActionOtp(
      req.body as SensitiveActionOtpDto,
      req.userId!,
    );
    if (!r.success) bail(r);
    else ResponseUtil.ok(res, r.data);
  },
);

const meta = (req: Request): { ip?: string; userAgent?: string } => ({
  ...(req.ip !== undefined ? { ip: req.ip } : {}),
  ...(req.headers['user-agent'] !== undefined ? { userAgent: req.headers['user-agent'] } : {}),
});
