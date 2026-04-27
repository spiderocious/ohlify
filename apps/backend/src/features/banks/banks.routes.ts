import { Router } from 'express';
import type { Express } from 'express';

import { rateLimitMiddleware } from '@lib/redis/rateLimit.js';
import { requireAuth } from '@middlewares/auth.middleware.js';
import { requireActiveUser } from '@middlewares/requireActiveUser.middleware.js';

import * as controller from './banks.controller.js';

export const register = (app: Express): void => {
  const banksRouter = Router();

  banksRouter.use(requireAuth, requireActiveUser);

  banksRouter.get('/', controller.listBanks);

  // Per-user limits: 30/min + 100/hour. Each Paystack /bank/resolve call costs
  // money, and clients debounce typing on the bank-account form.
  banksRouter.get(
    '/resolve',
    rateLimitMiddleware((req) => `bank-resolve-min:${req.userId ?? req.ip ?? 'anon'}`, 30, 60),
    rateLimitMiddleware((req) => `bank-resolve-hour:${req.userId ?? req.ip ?? 'anon'}`, 100, 3600),
    controller.resolveAccount,
  );

  app.use('/api/v1/banks', banksRouter);
};
