import { Router } from 'express';
import type { Express } from 'express';

import { validate } from '@lib/http/validateRequest.js';
import { rateLimitMiddleware } from '@lib/redis/rateLimit.js';
import { requireAuth } from '@middlewares/auth.middleware.js';
import { requireActiveUser } from '@middlewares/requireActiveUser.middleware.js';

import * as controller from './refunds.controller.js';
import { CreateRefundRequestSchema, ListRefundRequestsQuerySchema } from './refunds.schema.js';

export const register = (app: Express): void => {
  const router = Router();
  router.use(requireAuth, requireActiveUser);

  router.post(
    '/',
    rateLimitMiddleware((req) => `refund-create:${req.userId ?? 'anon'}`, 10, 3600),
    validate(CreateRefundRequestSchema),
    controller.create,
  );
  router.get('/', validate(ListRefundRequestsQuerySchema, 'query'), controller.list);
  router.get('/:id', controller.get);

  app.use('/api/v1/refunds', router);
};
