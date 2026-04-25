import { Router } from 'express';
import type { Express } from 'express';

import { validate } from '@lib/http/validateRequest.js';
import { rateLimitMiddleware } from '@lib/redis/rateLimit.js';
import { requireAuth } from '@middlewares/auth.middleware.js';

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

  onboardingRouter.get('/status', requireAuth, controller.getStatus);

  onboardingRouter.post('/role', requireAuth, validate(SetRoleSchema), controller.setRole);

  onboardingRouter.patch(
    '/kyc/client',
    requireAuth,
    validate(ClientKycPatchSchema),
    controller.patchClientKyc,
  );

  onboardingRouter.patch(
    '/kyc/professional',
    requireAuth,
    validate(ProfessionalKycPatchSchema),
    controller.patchProfessionalKyc,
  );

  // Handle availability — debounced from client; tight per-user rate limit.
  onboardingRouter.get(
    '/handle/check',
    requireAuth,
    rateLimitMiddleware((req) => `handle-check:${req.userId ?? req.ip ?? 'anon'}`, 60, 60),
    controller.checkHandle,
  );

  onboardingRouter.post('/kyc/complete', requireAuth, controller.completeKyc);

  // Post-onboarding handle rename lives under /me per spec §5.7.
  meRouter.post('/handle', requireAuth, validate(ChangeHandleSchema), controller.changeHandle);

  app.use('/api/v1/onboarding', onboardingRouter);
  app.use('/api/v1/me', meRouter);
};
