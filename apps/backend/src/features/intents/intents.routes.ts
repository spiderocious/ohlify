import { Router } from 'express';
import type { Express } from 'express';

import { validate } from '@lib/http/validateRequest.js';
import { rateLimitMiddleware } from '@lib/redis/rateLimit.js';
import { requireAuth } from '@middlewares/auth.middleware.js';
import { requireActiveUser } from '@middlewares/requireActiveUser.middleware.js';

import * as controller from './intents.controller.js';
import { CreateIntentSchema } from './intents.schema.js';

export const register = (app: Express): void => {
  const router = Router();

  router.use(requireAuth, requireActiveUser);

  router.post(
    '/',
    rateLimitMiddleware((req) => `intent-create:${req.userId ?? 'anon'}`, 60, 3600),
    validate(CreateIntentSchema),
    controller.create,
  );

  router.get('/:ref', controller.get);

  // Polled while a purchase settles, so the ceiling is generous — this only
  // ever re-reads balances.
  router.post(
    '/:ref/verify',
    rateLimitMiddleware((req) => `intent-verify:${req.userId ?? 'anon'}`, 240, 3600),
    controller.verify,
  );

  router.post('/:ref/cancel', controller.cancel);

  app.use('/api/v1/intents', router);
};
