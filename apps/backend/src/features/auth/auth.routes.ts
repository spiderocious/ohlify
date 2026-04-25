import { Router } from 'express';
import type { Express } from 'express';

import { validate } from '@lib/http/validateRequest.js';
import { ipRateLimit } from '@lib/redis/rateLimit.js';
import { requireAuth } from '@middlewares/auth.middleware.js';

import * as controller from './auth.controller.js';
import {
  ChangePasswordSchema,
  ForgotPasswordInitiateSchema,
  ForgotPasswordResetSchema,
  ForgotPasswordVerifyOtpSchema,
  LoginSchema,
  LogoutSchema,
  RefreshSchema,
  RegisterInitiateSchema,
  RegisterSetPasswordSchema,
  RegisterVerifySchema,
  ResendOtpSchema,
  SensitiveActionOtpSchema,
} from './auth.schema.js';

export const register = (app: Express): void => {
  const authRouter = Router();
  const meRouter = Router();

  // ── Registration ───────────────────────────────────────────────────────────
  authRouter.post(
    '/register/initiate',
    ipRateLimit(10, 15 * 60),
    validate(RegisterInitiateSchema),
    controller.registerInitiate,
  );

  authRouter.post(
    '/register/set-password',
    ipRateLimit(10, 15 * 60),
    validate(RegisterSetPasswordSchema),
    controller.registerSetPassword,
  );

  authRouter.post(
    '/register/verify',
    ipRateLimit(20, 15 * 60),
    validate(RegisterVerifySchema),
    controller.registerVerify,
  );

  authRouter.post(
    '/register/resend-otp',
    ipRateLimit(10, 15 * 60),
    validate(ResendOtpSchema),
    controller.resendOtp,
  );

  // ── Login / session ────────────────────────────────────────────────────────
  authRouter.post('/login', validate(LoginSchema), controller.login);

  authRouter.post('/refresh', validate(RefreshSchema), controller.refresh);

  authRouter.post('/logout', requireAuth, validate(LogoutSchema), controller.logout);

  // ── Forgot password ────────────────────────────────────────────────────────
  authRouter.post(
    '/forgot-password/initiate',
    ipRateLimit(10, 15 * 60),
    validate(ForgotPasswordInitiateSchema),
    controller.forgotPasswordInitiate,
  );

  authRouter.post(
    '/forgot-password/verify-otp',
    ipRateLimit(10, 15 * 60),
    validate(ForgotPasswordVerifyOtpSchema),
    controller.forgotPasswordVerifyOtp,
  );

  authRouter.post(
    '/forgot-password/reset',
    ipRateLimit(10, 15 * 60),
    validate(ForgotPasswordResetSchema),
    controller.forgotPasswordReset,
  );

  // ── Authenticated /me actions ──────────────────────────────────────────────
  meRouter.post(
    '/password',
    requireAuth,
    ipRateLimit(5, 60 * 60),
    validate(ChangePasswordSchema),
    controller.changePassword,
  );

  meRouter.post(
    '/sensitive-action/otp',
    requireAuth,
    validate(SensitiveActionOtpSchema),
    controller.requestSensitiveActionOtp,
  );

  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/me', meRouter);
};
