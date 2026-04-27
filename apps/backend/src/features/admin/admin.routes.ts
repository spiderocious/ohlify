import { Router } from 'express';
import type { Express } from 'express';

import { validate } from '@lib/http/validateRequest.js';
import { requireAdmin } from '@middlewares/requireAdmin.middleware.js';

import * as controller from './admin.controller.js';
import {
  ListAccountsQuerySchema,
  ListJournalsQuerySchema,
  ListWebhooksQuerySchema,
  SummaryWindowQuerySchema,
} from './admin.schema.js';

// All admin endpoints in this slice are gated by the stub X-Admin-Token
// middleware. See middlewares/requireAdmin.middleware.ts for the deprecation
// note + the §21 admin slice replacement.
export const register = (app: Express): void => {
  const router = Router();
  router.use(requireAdmin);

  // ── Wallet read paths ─────────────────────────────────────────────────────
  router.get('/wallets/users/:userId', controller.getUserWallet);
  router.get(
    '/wallets/accounts',
    validate(ListAccountsQuerySchema, 'query'),
    controller.listAccounts,
  );
  router.get('/wallets/accounts/:code', controller.getSystemAccount);
  router.get(
    '/wallets/journals',
    validate(ListJournalsQuerySchema, 'query'),
    controller.listJournals,
  );
  router.get('/wallets/journals/:id', controller.getJournal);

  // ── Reconciliation ───────────────────────────────────────────────────────
  router.get('/wallets/reconciliation/run', controller.runReconciliation);

  // ── Paystack webhooks ────────────────────────────────────────────────────
  router.get(
    '/wallets/paystack-webhooks',
    validate(ListWebhooksQuerySchema, 'query'),
    controller.listWebhooks,
  );

  // ── Period summaries ─────────────────────────────────────────────────────
  router.get(
    '/wallets/paystack-fees-summary',
    validate(SummaryWindowQuerySchema, 'query'),
    controller.getPaystackFeesSummary,
  );
  router.get(
    '/wallets/platform-revenue-summary',
    validate(SummaryWindowQuerySchema, 'query'),
    controller.getPlatformRevenueSummary,
  );

  app.use('/api/v1/admin', router);
};
