import { Router } from 'express';
import type { Express } from 'express';

import { validate } from '@lib/http/validateRequest.js';
import { rateLimitMiddleware } from '@lib/redis/rateLimit.js';
import { requireAuth } from '@middlewares/auth.middleware.js';
import { requireActiveUser } from '@middlewares/requireActiveUser.middleware.js';

import * as controller from './minutes.controller.js';
import { BalanceQuerySchema, BuyMinutesSchema } from './minutes.schema.js';

export const register = (app: Express): void => {
  const router = Router();

  router.use(requireAuth, requireActiveUser);

  // My minutes balances (all pros I hold minutes with).
  router.get('/', controller.listMine);

  // Balance for a specific pro + call_type.
  router.get('/balance', validate(BalanceQuerySchema, 'query'), controller.getForPro);

  // Buy minutes against a pro (wallet-funded).
  router.post(
    '/',
    rateLimitMiddleware((req) => `minutes-buy:${req.userId ?? 'anon'}`, 30, 3600),
    validate(BuyMinutesSchema),
    controller.buy,
  );

  app.use('/api/v1/me/minutes', router);
};
