import { Router } from 'express';
import type { Express } from 'express';

import { validate } from '@lib/http/validateRequest.js';
import { auditAdmin } from '@middlewares/auditAdmin.middleware.js';
import { requireAdmin, requireAdminRole } from '@middlewares/requireAdmin.middleware.js';

import * as contentController from './admin.content.controller.js';
import * as controller from './admin.controller.js';
import * as foundationsController from './admin.foundations.controller.js';
import * as kycController from './admin.kyc.controller.js';
import * as metricsController from './admin.metrics.controller.js';
import * as paymentsController from './admin.payments.controller.js';
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
  AdminApproveWithdrawalSchema,
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
  AdminListTransactionsQuerySchema,
  AdminListUsersQuerySchema,
  AdminListWithdrawalsQuerySchema,
  AdminMetricsRevenueQuerySchema,
  AdminPatchConfigSchema,
  AdminPublishLegalSchema,
  AdminRefundCallSchema,
  AdminRejectKycSchema,
  AdminRejectRefundSchema,
  AdminRejectWithdrawalSchema,
  AdminReplayWebhookSchema,
  AdminResetPasswordSchema,
  AdminResolveReportSchema,
  AdminSuspendUserSchema,
  AdminTestInitCallSchema,
  AdminUnsuspendUserSchema,
  AdminUpdateFaqSchema,
  ManualJournalSchema,
} from './admin.write.schema.js';

// Role tuples — keep them top-of-file so the access policy is reviewable
// in one glance without reading every route.
//
//   ANY_ADMIN      — any authenticated admin (read-mostly, low blast).
//   STAFF          — admin + support, the everyday moderation surface
//                    (users, KYC, reviews, reports, basic call ops).
//   FINANCE        — admin + finance_ops only, money-moving and
//                    finance-sensitive read paths (refunds, withdrawals,
//                    manual journals, transactions, force-end calls,
//                    revenue metrics).
//   ADMIN_ONLY     — strict admin-only (audit log, platform config,
//                    banner CRUD, content publishing).
//
// Stub-token writes (legacy X-Admin-Token) bypass the role gate inside
// requireAdminRole — see middleware. JWT writes get the full check.
const ANY_ADMIN = ['admin', 'support', 'finance_ops'] as const;
const STAFF = ['admin', 'support'] as const;
const FINANCE = ['admin', 'finance_ops'] as const;
const ADMIN_ONLY = ['admin'] as const;

export const register = (app: Express): void => {
  const router = Router();
  router.use(requireAdmin);

  // ── Wallet read paths (FINANCE) ───────────────────────────────────────────
  router.get('/wallets/users/:userId', requireAdminRole(FINANCE), controller.getUserWallet);
  router.get(
    '/wallets/accounts',
    requireAdminRole(FINANCE),
    validate(ListAccountsQuerySchema, 'query'),
    controller.listAccounts,
  );
  router.get('/wallets/accounts/:code', requireAdminRole(FINANCE), controller.getSystemAccount);
  router.get(
    '/wallets/journals',
    requireAdminRole(FINANCE),
    validate(ListJournalsQuerySchema, 'query'),
    controller.listJournals,
  );
  router.get('/wallets/journals/:id', requireAdminRole(FINANCE), controller.getJournal);

  // ── Reconciliation (FINANCE) ─────────────────────────────────────────────
  router.get(
    '/wallets/reconciliation/run',
    requireAdminRole(FINANCE),
    controller.runReconciliation,
  );

  // ── Paystack webhooks (FINANCE) ──────────────────────────────────────────
  router.get(
    '/wallets/paystack-webhooks',
    requireAdminRole(FINANCE),
    validate(ListWebhooksQuerySchema, 'query'),
    controller.listWebhooks,
  );

  // ── Period summaries (FINANCE) ───────────────────────────────────────────
  router.get(
    '/wallets/paystack-fees-summary',
    requireAdminRole(FINANCE),
    validate(SummaryWindowQuerySchema, 'query'),
    controller.getPaystackFeesSummary,
  );
  router.get(
    '/wallets/platform-revenue-summary',
    requireAdminRole(FINANCE),
    validate(SummaryWindowQuerySchema, 'query'),
    controller.getPlatformRevenueSummary,
  );

  // ── Wallet writes (FINANCE) ───────────────────────────────────────────────
  // Each write route layers auditAdmin AFTER validate so we only log
  // admissible requests. The middleware writes on response 'finish' if
  // status was 2xx, so failed/rejected actions don't pollute the log.
  router.post(
    '/wallets/manual-journal',
    requireAdminRole(FINANCE),
    validate(ManualJournalSchema),
    auditAdmin({ action: 'wallets.manual_journal', targetType: 'journal' }),
    writeController.postManualJournal,
  );
  router.post(
    '/wallets/credit',
    requireAdminRole(FINANCE),
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
    requireAdminRole(FINANCE),
    validate(AdminDebitSchema),
    auditAdmin({
      action: 'wallets.debit',
      targetType: 'user',
      targetIdFrom: (req) => (req.body as { user_id?: string }).user_id ?? null,
    }),
    writeController.adminDebit,
  );

  // Refunds (FINANCE — money-moving)
  router.get(
    '/refunds',
    requireAdminRole(FINANCE),
    validate(AdminListRefundsQuerySchema, 'query'),
    writeController.listRefunds,
  );
  router.post(
    '/refunds/:id/approve',
    requireAdminRole(FINANCE),
    validate(AdminApproveRefundSchema),
    auditAdmin({ action: 'refunds.approve', targetType: 'refund' }),
    writeController.approveRefund,
  );
  router.post(
    '/refunds/:id/reject',
    requireAdminRole(FINANCE),
    validate(AdminRejectRefundSchema),
    auditAdmin({ action: 'refunds.reject', targetType: 'refund' }),
    writeController.rejectRefund,
  );

  // Withdrawals (FINANCE)
  router.get(
    '/withdrawals',
    requireAdminRole(FINANCE),
    validate(AdminListWithdrawalsQuerySchema, 'query'),
    writeController.listWithdrawals,
  );
  router.post(
    '/withdrawals/:id/approve',
    requireAdminRole(FINANCE),
    validate(AdminApproveWithdrawalSchema),
    auditAdmin({ action: 'withdrawals.approve', targetType: 'withdrawal' }),
    paymentsController.approveWithdrawal,
  );
  router.post(
    '/withdrawals/:id/reject',
    requireAdminRole(FINANCE),
    validate(AdminRejectWithdrawalSchema),
    auditAdmin({ action: 'withdrawals.reject', targetType: 'withdrawal' }),
    paymentsController.rejectWithdrawal,
  );
  router.post(
    '/withdrawals/:id/force-fail',
    requireAdminRole(FINANCE),
    validate(AdminForceFailWithdrawalSchema),
    auditAdmin({ action: 'withdrawals.force_fail', targetType: 'withdrawal' }),
    writeController.forceFailWithdrawal,
  );

  // Transactions list/detail + payout sync (FINANCE)
  router.get(
    '/transactions',
    requireAdminRole(FINANCE),
    validate(AdminListTransactionsQuerySchema, 'query'),
    paymentsController.listTransactions,
  );
  router.get('/transactions/:id', requireAdminRole(FINANCE), paymentsController.getTransaction);
  router.post(
    '/payouts/sync',
    requireAdminRole(FINANCE),
    auditAdmin({ action: 'payouts.sync', targetType: 'withdrawal' }),
    paymentsController.syncPayouts,
  );

  // Webhook replay (FINANCE — touches money flows)
  router.post(
    '/wallets/replay-webhook',
    requireAdminRole(FINANCE),
    validate(AdminReplayWebhookSchema),
    auditAdmin({
      action: 'wallets.replay_webhook',
      targetType: 'webhook',
      targetIdFrom: (req) => (req.body as { webhook_id?: string }).webhook_id ?? null,
    }),
    writeController.replayWebhook,
  );

  // ── Calls + bookings (STAFF for read/force-end; FINANCE for force-end
  // because it can post settlement+refund journals; test-init is dev-only
  // but locked to ADMIN_ONLY since it spends caller wallet). ───────────────
  router.post(
    '/calls/test-init',
    requireAdminRole(ADMIN_ONLY),
    validate(AdminTestInitCallSchema),
    auditAdmin({ action: 'calls.test_init', targetType: 'call' }),
    writeController.testInitCall,
  );
  router.get(
    '/calls',
    requireAdminRole(STAFF),
    validate(AdminListCallsQuerySchema, 'query'),
    writeController.listCalls,
  );
  router.get('/calls/:id', requireAdminRole(STAFF), writeController.getCallDetail);
  router.post(
    '/calls/:id/force-end',
    requireAdminRole(FINANCE),
    auditAdmin({ action: 'calls.force_end', targetType: 'call' }),
    writeController.forceEndCall,
  );
  router.post(
    '/calls/:id/refund',
    requireAdminRole(FINANCE),
    validate(AdminRefundCallSchema),
    auditAdmin({ action: 'calls.refund', targetType: 'call' }),
    writeController.refundCall,
  );
  router.get(
    '/bookings',
    requireAdminRole(STAFF),
    validate(AdminListBookingsQuerySchema, 'query'),
    writeController.listBookings,
  );

  // ── Foundations: audit log + config (ADMIN_ONLY — sensitive) ─────────────
  router.get(
    '/audit-log',
    requireAdminRole(ADMIN_ONLY),
    validate(AdminListAuditLogQuerySchema, 'query'),
    foundationsController.listAuditLog,
  );
  router.get('/config', requireAdminRole(ADMIN_ONLY), foundationsController.getConfig);
  router.patch(
    '/config',
    requireAdminRole(ADMIN_ONLY),
    validate(AdminPatchConfigSchema),
    // patchConfig writes its own audit row inside the same tx (with full
    // before/after snapshot), so we don't layer auditAdmin here — that
    // would write a second, less useful row.
    foundationsController.patchConfig,
  );

  // ── Users (STAFF) ────────────────────────────────────────────────────────
  router.get(
    '/users',
    requireAdminRole(STAFF),
    validate(AdminListUsersQuerySchema, 'query'),
    usersController.list,
  );
  router.get('/users/:id', requireAdminRole(STAFF), usersController.get);
  router.post(
    '/users/:id/suspend',
    requireAdminRole(STAFF),
    validate(AdminSuspendUserSchema),
    auditAdmin({ action: 'users.suspend', targetType: 'user' }),
    usersController.suspend,
  );
  router.post(
    '/users/:id/unsuspend',
    requireAdminRole(STAFF),
    validate(AdminUnsuspendUserSchema),
    auditAdmin({ action: 'users.unsuspend', targetType: 'user' }),
    usersController.unsuspend,
  );
  router.post(
    '/users/:id/block',
    requireAdminRole(STAFF),
    validate(AdminBlockUserSchema),
    auditAdmin({ action: 'users.block', targetType: 'user' }),
    usersController.block,
  );
  router.post(
    '/users/:id/unblock',
    requireAdminRole(STAFF),
    validate(AdminUnsuspendUserSchema),
    auditAdmin({ action: 'users.unblock', targetType: 'user' }),
    usersController.unblock,
  );
  router.post(
    '/users/:id/reset-password',
    requireAdminRole(STAFF),
    validate(AdminResetPasswordSchema),
    auditAdmin({ action: 'users.reset_password', targetType: 'user' }),
    usersController.resetPassword,
  );
  // Impersonate is STAFF-permissive but separately audited; spec'd as
  // "heavily audit-logged" — auditAdmin already handles that.
  router.post(
    '/users/:id/impersonate',
    requireAdminRole(STAFF),
    validate(AdminImpersonateUserSchema),
    auditAdmin({ action: 'users.impersonate', targetType: 'user' }),
    usersController.impersonate,
  );

  // ── KYC (STAFF) ──────────────────────────────────────────────────────────
  router.get(
    '/kyc/submissions',
    requireAdminRole(STAFF),
    validate(AdminListKycQuerySchema, 'query'),
    kycController.list,
  );
  router.post(
    '/kyc/submissions/:id/approve',
    requireAdminRole(STAFF),
    validate(AdminApproveKycSchema),
    auditAdmin({ action: 'kyc.approve', targetType: 'kyc_submission' }),
    kycController.approve,
  );
  router.post(
    '/kyc/submissions/:id/reject',
    requireAdminRole(STAFF),
    validate(AdminRejectKycSchema),
    auditAdmin({ action: 'kyc.reject', targetType: 'kyc_submission' }),
    kycController.reject,
  );

  // ── Reports (STAFF) ──────────────────────────────────────────────────────
  router.get(
    '/reports',
    requireAdminRole(STAFF),
    validate(AdminListReportsQuerySchema, 'query'),
    reportsController.list,
  );
  router.post(
    '/reports/:id/resolve',
    requireAdminRole(STAFF),
    validate(AdminResolveReportSchema),
    auditAdmin({ action: 'reports.resolve', targetType: 'report' }),
    reportsController.resolve,
  );
  router.post(
    '/reports/:id/dismiss',
    requireAdminRole(STAFF),
    validate(AdminDismissReportSchema),
    auditAdmin({ action: 'reports.dismiss', targetType: 'report' }),
    reportsController.dismiss,
  );

  // ── Content: legal + FAQs (ADMIN_ONLY — public-facing copy) ──────────────
  router.get('/legal/:kind', requireAdminRole(ADMIN_ONLY), contentController.listLegal);
  router.put(
    '/legal/:kind',
    requireAdminRole(ADMIN_ONLY),
    validate(AdminPublishLegalSchema),
    auditAdmin({
      action: 'legal.publish',
      targetType: 'legal_document',
      targetIdFrom: (req) => String(req.params['kind']),
    }),
    contentController.publishLegal,
  );

  router.get('/faqs', requireAdminRole(ADMIN_ONLY), contentController.listFaqs);
  router.post(
    '/faqs',
    requireAdminRole(ADMIN_ONLY),
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
    requireAdminRole(ADMIN_ONLY),
    validate(AdminUpdateFaqSchema),
    auditAdmin({ action: 'faqs.update', targetType: 'faq' }),
    contentController.updateFaq,
  );
  router.delete(
    '/faqs/:id',
    requireAdminRole(ADMIN_ONLY),
    auditAdmin({ action: 'faqs.delete', targetType: 'faq' }),
    contentController.deleteFaq,
  );

  // ── Metrics (overview/cohorts → ANY_ADMIN; revenue → FINANCE) ────────────
  router.get('/metrics/overview', requireAdminRole(ANY_ADMIN), metricsController.overview);
  router.get(
    '/metrics/revenue',
    requireAdminRole(FINANCE),
    validate(AdminMetricsRevenueQuerySchema, 'query'),
    metricsController.revenue,
  );
  router.get('/metrics/cohorts', requireAdminRole(ANY_ADMIN), metricsController.cohorts);

  app.use('/api/v1/admin', router);
};
