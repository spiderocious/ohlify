import { Router } from 'express';
import type { Express } from 'express';

import { validate } from '@lib/http/validateRequest.js';
import { rateLimitMiddleware } from '@lib/redis/rateLimit.js';
import { requireAuth } from '@middlewares/auth.middleware.js';
import { requireActiveUser } from '@middlewares/requireActiveUser.middleware.js';

import * as controller from './wallet.controller.js';
import {
  InitializeFundingSchema,
  ListWithdrawalsQuerySchema,
  PayFromWalletSchema,
  RequestWithdrawalSchema,
  TransactionsQuerySchema,
  VerifyFundingSchema,
} from './wallet.schema.js';

export const register = (app: Express): void => {
  const router = Router();
  router.use(requireAuth, requireActiveUser);

  router.get('/', controller.getSummary);
  router.get('/stats', controller.getStats);
  router.get(
    '/transactions',
    validate(TransactionsQuerySchema, 'query'),
    controller.listTransactions,
  );

  // Funding — initialize and verify. The verify endpoint is a polling
  // fallback; webhook is the source of truth. Tighter rate limit on
  // initialize (each call hits Paystack and creates a payment row).
  router.post(
    '/fund/initialize',
    rateLimitMiddleware((req) => `wallet-fund-init:${req.userId ?? 'anon'}`, 10, 3600),
    validate(InitializeFundingSchema),
    controller.initializeFunding,
  );

  router.post(
    '/fund/verify',
    rateLimitMiddleware((req) => `wallet-fund-verify:${req.userId ?? 'anon'}`, 60, 600),
    validate(VerifyFundingSchema),
    controller.verifyFunding,
  );

  // Wallet-first pay (debits wallet → pending pool). Returns 409 +
  // short_by_kobo on insufficient balance so mobile can redirect to fund.
  router.post(
    '/pay',
    rateLimitMiddleware((req) => `wallet-pay:${req.userId ?? 'anon'}`, 30, 60),
    validate(PayFromWalletSchema),
    controller.pay,
  );

  // Withdrawals.
  router.post(
    '/withdraw',
    rateLimitMiddleware((req) => `wallet-withdraw:${req.userId ?? 'anon'}`, 5, 600),
    validate(RequestWithdrawalSchema),
    controller.requestWithdrawal,
  );
  router.get(
    '/withdrawals',
    validate(ListWithdrawalsQuerySchema, 'query'),
    controller.listWithdrawals,
  );
  router.get('/withdrawals/:id', controller.getWithdrawal);

  app.use('/api/v1/wallet', router);
};
