import { Router } from 'express';
import type { Express } from 'express';

import { validate } from '@lib/http/validateRequest.js';
import { rateLimitMiddleware } from '@lib/redis/rateLimit.js';
import { requireAuth } from '@middlewares/auth.middleware.js';
import { requireActiveUser } from '@middlewares/requireActiveUser.middleware.js';

import * as controller from './onboarding.controller.js';
import {
  ChangeHandleSchema,
  ClientKycPatchSchema,
  ProfessionalKycPatchSchema,
  SetRoleSchema,
} from './onboarding.schema.js';

export const register = (app: Express): void => {
  const onboardingRouter = Router();
  const meRouter = Router();

  // Every authed onboarding/me route requires the JWT-derived user to still
  // exist (not soft-deleted). Closes QA F-02.
  onboardingRouter.use(requireAuth, requireActiveUser);
  meRouter.use(requireAuth, requireActiveUser);

  onboardingRouter.get('/status', controller.getStatus);

  // Spec endpoint that powers the entire KYC screen — returns the list of
  // items required for the caller's role with current values + completeness.
  // See api-docs/onboarding-kyc-spec.md.
  onboardingRouter.get('/kyc/spec', controller.getKycSpec);

  onboardingRouter.post('/role', validate(SetRoleSchema), controller.setRole);

  onboardingRouter.patch('/kyc/client', validate(ClientKycPatchSchema), controller.patchClientKyc);

  onboardingRouter.patch(
    '/kyc/professional',
    validate(ProfessionalKycPatchSchema),
    controller.patchProfessionalKyc,
  );

  // Handle availability — debounced from client; tight per-user rate limit.
  onboardingRouter.get(
    '/handle/check',
    rateLimitMiddleware((req) => `handle-check:${req.userId ?? req.ip ?? 'anon'}`, 60, 60),
    controller.checkHandle,
  );

  onboardingRouter.post('/kyc/complete', controller.completeKyc);

  // Post-onboarding handle rename lives under /me per spec §5.7.
  meRouter.post('/handle', validate(ChangeHandleSchema), controller.changeHandle);

  app.use('/api/v1/onboarding', onboardingRouter);
  app.use('/api/v1/me', meRouter);
};
