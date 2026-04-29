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
import * as writeController from './admin.write.controller.js';
import {
  AdminApproveRefundSchema,
  AdminCreditSchema,
  AdminDebitSchema,
  AdminForceFailWithdrawalSchema,
  AdminListBookingsQuerySchema,
  AdminListCallsQuerySchema,
  AdminListRefundsQuerySchema,
  AdminListWithdrawalsQuerySchema,
  AdminRejectRefundSchema,
  AdminReplayWebhookSchema,
  AdminTestInitCallSchema,
  ManualJournalSchema,
} from './admin.write.schema.js';

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

  // ── Admin write paths (slice B) ───────────────────────────────────────────
  router.post(
    '/wallets/manual-journal',
    validate(ManualJournalSchema),
    writeController.postManualJournal,
  );
  router.post('/wallets/credit', validate(AdminCreditSchema), writeController.adminCredit);
  router.post('/wallets/debit', validate(AdminDebitSchema), writeController.adminDebit);

  // Refunds (admin)
  router.get(
    '/refunds',
    validate(AdminListRefundsQuerySchema, 'query'),
    writeController.listRefunds,
  );
  router.post(
    '/refunds/:id/approve',
    validate(AdminApproveRefundSchema),
    writeController.approveRefund,
  );
  router.post(
    '/refunds/:id/reject',
    validate(AdminRejectRefundSchema),
    writeController.rejectRefund,
  );

  // Withdrawals (admin)
  router.get(
    '/withdrawals',
    validate(AdminListWithdrawalsQuerySchema, 'query'),
    writeController.listWithdrawals,
  );
  router.post(
    '/withdrawals/:id/force-fail',
    validate(AdminForceFailWithdrawalSchema),
    writeController.forceFailWithdrawal,
  );

  // Webhook replay
  router.post(
    '/wallets/replay-webhook',
    validate(AdminReplayWebhookSchema),
    writeController.replayWebhook,
  );

  // ── Calls + bookings (admin) ─────────────────────────────────────────────
  router.post('/calls/test-init', validate(AdminTestInitCallSchema), writeController.testInitCall);
  router.get('/calls', validate(AdminListCallsQuerySchema, 'query'), writeController.listCalls);
  router.post('/calls/:id/force-end', writeController.forceEndCall);
  router.get(
    '/bookings',
    validate(AdminListBookingsQuerySchema, 'query'),
    writeController.listBookings,
  );

  app.use('/api/v1/admin', router);
};
