import { Router } from 'express';
import type { Express } from 'express';

import { validate } from '@lib/http/validateRequest.js';
import { ipRateLimit } from '@lib/redis/rateLimit.js';
import { requireAuth } from '@middlewares/auth.middleware.js';
import { requireActiveUser } from '@middlewares/requireActiveUser.middleware.js';
import { requireFeatureEnabled } from '@middlewares/requireFeatureEnabled.middleware.js';

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
  // Only the entry step is gated. Switching registration off mid-flow should
  // stop new signups, not strand someone who already has a half-created
  // account and no way to finish it.
  authRouter.post(
    '/register/initiate',
    requireFeatureEnabled('registration'),
    ipRateLimit(10, 15 * 60, 'auth:register'),
    validate(RegisterInitiateSchema),
    controller.registerInitiate,
  );

  authRouter.post(
    '/register/set-password',
    ipRateLimit(10, 15 * 60, 'auth:register'),
    validate(RegisterSetPasswordSchema),
    controller.registerSetPassword,
  );

  authRouter.post(
    '/register/verify',
    // Its own budget, and larger: mistyping a 6-digit OTP is ordinary, and
    // burning the registration allowance on typos would strand a real signup.
    ipRateLimit(20, 15 * 60, 'auth:register:verify'),
    validate(RegisterVerifySchema),
    controller.registerVerify,
  );

  authRouter.post(
    '/register/resend-otp',
    ipRateLimit(10, 15 * 60, 'auth:register:resend'),
    validate(ResendOtpSchema),
    controller.resendOtp,
  );

  // ── Login / session ────────────────────────────────────────────────────────
  // `/refresh` is deliberately NOT gated: revoking it would log out every
  // already-signed-in user the moment their access token lapsed, turning a
  // login pause into a full eviction.
  authRouter.post(
    '/login',
    requireFeatureEnabled('login'),
    // Explicitly limited. It previously carried no `ipRateLimit` of its own
    // and leaned on the shared per-IP counter — which, now that counters are
    // correctly split per scope, would leave the one endpoint most worth
    // brute-forcing with no dedicated ceiling at all.
    //
    // 20 in 15 minutes: comfortably above a person mistyping a password
    // several times, well below anything useful for guessing. Sliding, so a
    // legitimate user recovers attempts continuously rather than waiting out
    // a full window.
    ipRateLimit(20, 15 * 60, 'auth:login'),
    validate(LoginSchema),
    controller.login,
  );

  authRouter.post('/refresh', validate(RefreshSchema), controller.refresh);

  authRouter.post('/logout', requireAuth, validate(LogoutSchema), controller.logout);

  // ── Forgot password ────────────────────────────────────────────────────────
  authRouter.post(
    '/forgot-password/initiate',
    // All three steps share one scope on purpose — otherwise a caller gets 10
    // fresh attempts at each stage of a single reset.
    ipRateLimit(10, 15 * 60, 'auth:forgot-password'),
    validate(ForgotPasswordInitiateSchema),
    controller.forgotPasswordInitiate,
  );

  authRouter.post(
    '/forgot-password/verify-otp',
    ipRateLimit(10, 15 * 60, 'auth:forgot-password'),
    validate(ForgotPasswordVerifyOtpSchema),
    controller.forgotPasswordVerifyOtp,
  );

  authRouter.post(
    '/forgot-password/reset',
    ipRateLimit(10, 15 * 60, 'auth:forgot-password'),
    validate(ForgotPasswordResetSchema),
    controller.forgotPasswordReset,
  );

  // ── Authenticated /me actions ──────────────────────────────────────────────
  // requireActiveUser (not just requireAuth): a suspended/blocked user must not
  // be able to change their password or request a sensitive-action OTP with a
  // still-valid access token. (BUGS.md D7.)
  meRouter.post(
    '/password',
    requireAuth,
    requireActiveUser,
    ipRateLimit(5, 60 * 60, 'auth:change-password'),
    validate(ChangePasswordSchema),
    controller.changePassword,
  );

  meRouter.post(
    '/sensitive-action/otp',
    requireAuth,
    requireActiveUser,
    validate(SensitiveActionOtpSchema),
    controller.requestSensitiveActionOtp,
  );

  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/me', meRouter);
};
