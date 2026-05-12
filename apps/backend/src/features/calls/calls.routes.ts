import { Router } from 'express';
import type { Express } from 'express';

import { validate } from '@lib/http/validateRequest.js';
import { rateLimitMiddleware } from '@lib/redis/rateLimit.js';
import { requireAuth } from '@middlewares/auth.middleware.js';
import { requireActiveUser } from '@middlewares/requireActiveUser.middleware.js';

import * as controller from './calls.controller.js';
import { ListCallHistoryQuerySchema, ListCallsQuerySchema } from './calls.schema.js';

export const register = (app: Express): void => {
  const router = Router();
  router.use(requireAuth, requireActiveUser);

  // History + joinable routes MUST come before `/:id` so they're not
  // matched as ids.
  router.get(
    '/history',
    validate(ListCallHistoryQuerySchema, 'query'),
    controller.listHistory,
  );
  router.get('/history/:id', controller.getHistoryItem);
  router.get('/joinable', controller.listJoinable);

  router.get('/', validate(ListCallsQuerySchema, 'query'), controller.list);
  router.get('/:id', controller.get);
  router.post(
    '/:id/join',
    rateLimitMiddleware((req) => `call-join:${req.userId ?? 'anon'}`, 30, 600),
    controller.join,
  );
  router.post('/:id/leave', controller.leave);
  router.post(
    '/:id/renew-token',
    rateLimitMiddleware((req) => `call-renew:${req.userId ?? 'anon'}`, 30, 600),
    controller.renewToken,
  );
  router.post('/:id/decline', controller.decline);

  app.use('/api/v1/calls', router);
};
