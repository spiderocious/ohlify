import { Router } from 'express';
import type { Express } from 'express';

import { validate } from '@lib/http/validateRequest.js';
import { auditAdmin } from '@middlewares/auditAdmin.middleware.js';
import { requireAdmin } from '@middlewares/requireAdmin.middleware.js';

import * as contentController from './admin.content.controller.js';
import * as controller from './admin.controller.js';
import * as foundationsController from './admin.foundations.controller.js';
import * as kycController from './admin.kyc.controller.js';
import * as metricsController from './admin.metrics.controller.js';
import * as reportsController from './admin.reports.controller.js';
import {
  ListAccountsQuerySchema,
  ListJournalsQuerySchema,
  ListWebhooksQuerySchema,
  SummaryWindowQuerySchema,
} from './admin.schema.js';
import * as usersController from './admin.users.controller.js';
import * as writeController from './admin.write.controller.js';
import {
  AdminApproveKycSchema,
  AdminApproveRefundSchema,
  AdminBlockUserSchema,
  AdminCreateFaqSchema,
  AdminDismissReportSchema,
  AdminCreditSchema,
  AdminDebitSchema,
  AdminForceFailWithdrawalSchema,
  AdminImpersonateUserSchema,
  AdminListAuditLogQuerySchema,
  AdminListBookingsQuerySchema,
  AdminListCallsQuerySchema,
  AdminListKycQuerySchema,
  AdminListRefundsQuerySchema,
  AdminListReportsQuerySchema,
  AdminListUsersQuerySchema,
  AdminListWithdrawalsQuerySchema,
  AdminPatchConfigSchema,
  AdminPublishLegalSchema,
  AdminRejectKycSchema,
  AdminRejectRefundSchema,
  AdminReplayWebhookSchema,
  AdminResetPasswordSchema,
  AdminResolveReportSchema,
  AdminSuspendUserSchema,
  AdminTestInitCallSchema,
  AdminUnsuspendUserSchema,
  AdminUpdateFaqSchema,
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
  // Each write route layers auditAdmin AFTER validate so we only log
  // admissible requests. The middleware writes on response 'finish' if
  // status was 2xx, so failed/rejected actions don't pollute the log.
  router.post(
    '/wallets/manual-journal',
    validate(ManualJournalSchema),
    auditAdmin({ action: 'wallets.manual_journal', targetType: 'journal' }),
    writeController.postManualJournal,
  );
  router.post(
    '/wallets/credit',
    validate(AdminCreditSchema),
    auditAdmin({
      action: 'wallets.credit',
      targetType: 'user',
      targetIdFrom: (req) => (req.body as { user_id?: string }).user_id ?? null,
    }),
    writeController.adminCredit,
  );
  router.post(
    '/wallets/debit',
    validate(AdminDebitSchema),
    auditAdmin({
      action: 'wallets.debit',
      targetType: 'user',
      targetIdFrom: (req) => (req.body as { user_id?: string }).user_id ?? null,
    }),
    writeController.adminDebit,
  );

  // Refunds (admin)
  router.get(
    '/refunds',
    validate(AdminListRefundsQuerySchema, 'query'),
    writeController.listRefunds,
  );
  router.post(
    '/refunds/:id/approve',
    validate(AdminApproveRefundSchema),
    auditAdmin({ action: 'refunds.approve', targetType: 'refund' }),
    writeController.approveRefund,
  );
  router.post(
    '/refunds/:id/reject',
    validate(AdminRejectRefundSchema),
    auditAdmin({ action: 'refunds.reject', targetType: 'refund' }),
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
    auditAdmin({ action: 'withdrawals.force_fail', targetType: 'withdrawal' }),
    writeController.forceFailWithdrawal,
  );

  // Webhook replay
  router.post(
    '/wallets/replay-webhook',
    validate(AdminReplayWebhookSchema),
    auditAdmin({
      action: 'wallets.replay_webhook',
      targetType: 'webhook',
      targetIdFrom: (req) => (req.body as { webhook_id?: string }).webhook_id ?? null,
    }),
    writeController.replayWebhook,
  );

  // ── Calls + bookings (admin) ─────────────────────────────────────────────
  router.post(
    '/calls/test-init',
    validate(AdminTestInitCallSchema),
    auditAdmin({ action: 'calls.test_init', targetType: 'call' }),
    writeController.testInitCall,
  );
  router.get('/calls', validate(AdminListCallsQuerySchema, 'query'), writeController.listCalls);
  router.get('/calls/:id', writeController.getCallDetail);
  router.post(
    '/calls/:id/force-end',
    auditAdmin({ action: 'calls.force_end', targetType: 'call' }),
    writeController.forceEndCall,
  );
  router.get(
    '/bookings',
    validate(AdminListBookingsQuerySchema, 'query'),
    writeController.listBookings,
  );

  // ── Foundations: audit log + config ──────────────────────────────────────
  router.get(
    '/audit-log',
    validate(AdminListAuditLogQuerySchema, 'query'),
    foundationsController.listAuditLog,
  );
  router.get('/config', foundationsController.getConfig);
  router.patch(
    '/config',
    validate(AdminPatchConfigSchema),
    // patchConfig writes its own audit row inside the same tx (with full
    // before/after snapshot), so we don't layer auditAdmin here — that
    // would write a second, less useful row.
    foundationsController.patchConfig,
  );

  // ── Users (admin) ────────────────────────────────────────────────────────
  router.get('/users', validate(AdminListUsersQuerySchema, 'query'), usersController.list);
  router.get('/users/:id', usersController.get);
  router.post(
    '/users/:id/suspend',
    validate(AdminSuspendUserSchema),
    auditAdmin({ action: 'users.suspend', targetType: 'user' }),
    usersController.suspend,
  );
  router.post(
    '/users/:id/unsuspend',
    validate(AdminUnsuspendUserSchema),
    auditAdmin({ action: 'users.unsuspend', targetType: 'user' }),
    usersController.unsuspend,
  );
  router.post(
    '/users/:id/block',
    validate(AdminBlockUserSchema),
    auditAdmin({ action: 'users.block', targetType: 'user' }),
    usersController.block,
  );
  router.post(
    '/users/:id/unblock',
    validate(AdminUnsuspendUserSchema),
    auditAdmin({ action: 'users.unblock', targetType: 'user' }),
    usersController.unblock,
  );
  router.post(
    '/users/:id/reset-password',
    validate(AdminResetPasswordSchema),
    auditAdmin({ action: 'users.reset_password', targetType: 'user' }),
    usersController.resetPassword,
  );
  router.post(
    '/users/:id/impersonate',
    validate(AdminImpersonateUserSchema),
    auditAdmin({ action: 'users.impersonate', targetType: 'user' }),
    usersController.impersonate,
  );

  // ── KYC (admin) ──────────────────────────────────────────────────────────
  router.get('/kyc/submissions', validate(AdminListKycQuerySchema, 'query'), kycController.list);
  router.post(
    '/kyc/submissions/:id/approve',
    validate(AdminApproveKycSchema),
    auditAdmin({ action: 'kyc.approve', targetType: 'kyc_submission' }),
    kycController.approve,
  );
  router.post(
    '/kyc/submissions/:id/reject',
    validate(AdminRejectKycSchema),
    auditAdmin({ action: 'kyc.reject', targetType: 'kyc_submission' }),
    kycController.reject,
  );

  // ── Reports (admin) ──────────────────────────────────────────────────────
  router.get('/reports', validate(AdminListReportsQuerySchema, 'query'), reportsController.list);
  router.post(
    '/reports/:id/resolve',
    validate(AdminResolveReportSchema),
    auditAdmin({ action: 'reports.resolve', targetType: 'report' }),
    reportsController.resolve,
  );
  router.post(
    '/reports/:id/dismiss',
    validate(AdminDismissReportSchema),
    auditAdmin({ action: 'reports.dismiss', targetType: 'report' }),
    reportsController.dismiss,
  );

  // ── Content: legal + FAQs ─────────────────────────────────────────────────
  router.get('/legal/:kind', contentController.listLegal);
  router.put(
    '/legal/:kind',
    validate(AdminPublishLegalSchema),
    auditAdmin({
      action: 'legal.publish',
      targetType: 'legal_document',
      targetIdFrom: (req) => String(req.params['kind']),
    }),
    contentController.publishLegal,
  );

  router.get('/faqs', contentController.listFaqs);
  router.post(
    '/faqs',
    validate(AdminCreateFaqSchema),
    auditAdmin({
      action: 'faqs.create',
      targetType: 'faq',
      targetIdFrom: () => null,
    }),
    contentController.createFaq,
  );
  router.patch(
    '/faqs/:id',
    validate(AdminUpdateFaqSchema),
    auditAdmin({ action: 'faqs.update', targetType: 'faq' }),
    contentController.updateFaq,
  );
  router.delete(
    '/faqs/:id',
    auditAdmin({ action: 'faqs.delete', targetType: 'faq' }),
    contentController.deleteFaq,
  );

  // ── Metrics (admin) ───────────────────────────────────────────────────────
  router.get('/metrics/overview', metricsController.overview);
  router.get('/metrics/revenue', metricsController.revenue);
  router.get('/metrics/cohorts', metricsController.cohorts);

  app.use('/api/v1/admin', router);
};
