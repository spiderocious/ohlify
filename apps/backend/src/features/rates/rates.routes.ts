import { Router } from 'express';
import type { Express } from 'express';

import { validate } from '@lib/http/validateRequest.js';
import { rateLimitMiddleware } from '@lib/redis/rateLimit.js';
import { requireAuth } from '@middlewares/auth.middleware.js';
import { requireActiveUser } from '@middlewares/requireActiveUser.middleware.js';
import { requireRole } from '@middlewares/requireRole.middleware.js';

import * as controller from './rates.controller.js';
import { CreateRateSchema, RateIdParamSchema, UpdateRateSchema } from './rates.schema.js';

export const register = (app: Express): void => {
  const ratesRouter = Router();

  ratesRouter.use(requireAuth, requireActiveUser, requireRole('professional'));

  ratesRouter.get('/', controller.listMine);

  ratesRouter.post(
    '/',
    rateLimitMiddleware((req) => `rate-create:${req.userId ?? 'anon'}`, 30, 3600),
    validate(CreateRateSchema),
    controller.create,
  );

  ratesRouter.patch(
    '/:id',
    rateLimitMiddleware((req) => `rate-mutate:${req.userId ?? 'anon'}`, 60, 3600),
    validate(RateIdParamSchema, 'params'),
    validate(UpdateRateSchema),
    controller.update,
  );

  ratesRouter.delete(
    '/:id',
    rateLimitMiddleware((req) => `rate-mutate:${req.userId ?? 'anon'}`, 60, 3600),
    validate(RateIdParamSchema, 'params'),
    controller.remove,
  );

  app.use('/api/v1/me/rates', ratesRouter);
};
