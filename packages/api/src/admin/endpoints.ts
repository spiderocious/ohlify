/**
 * Admin endpoints, mirroring backend/src/features/admin* + admin-mounted
 * routes on other features (reviews, strikes, banners). Path-builder helpers
 * keep param substitution type-checked at call sites.
 */
const BASE = 'api/v1';
const ADMIN = `${BASE}/admin`;

export const ADMIN_EP = {
  // Admin auth (admin-auth.routes.ts)
  AUTH_LOGIN:                 `${BASE}/admin/auth/login`,
  AUTH_REFRESH:               `${BASE}/admin/auth/refresh`,
  AUTH_LOGOUT:                `${BASE}/admin/auth/logout`,
  AUTH_TOTP_SETUP:            `${BASE}/admin/auth/totp/setup`,
  AUTH_TOTP_CONFIRM:          `${BASE}/admin/auth/totp/confirm`,

  // Metrics
  METRICS_OVERVIEW:           `${ADMIN}/metrics/overview`,
  METRICS_REVENUE:            `${ADMIN}/metrics/revenue`,
  METRICS_COHORTS:            `${ADMIN}/metrics/cohorts`,

  // Users
  USERS:                      `${ADMIN}/users`,
  USER:                       (id: string) => `${ADMIN}/users/${id}`,
  USER_SUSPEND:               (id: string) => `${ADMIN}/users/${id}/suspend`,
  USER_UNSUSPEND:             (id: string) => `${ADMIN}/users/${id}/unsuspend`,
  USER_BLOCK:                 (id: string) => `${ADMIN}/users/${id}/block`,
  USER_UNBLOCK:               (id: string) => `${ADMIN}/users/${id}/unblock`,
  USER_RESET_PASSWORD:        (id: string) => `${ADMIN}/users/${id}/reset-password`,
  USER_IMPERSONATE:           (id: string) => `${ADMIN}/users/${id}/impersonate`,

  // KYC review
  KYC_LIST:                   `${ADMIN}/kyc/submissions`,
  KYC_APPROVE:                (id: string) => `${ADMIN}/kyc/submissions/${id}/approve`,
  KYC_REJECT:                 (id: string) => `${ADMIN}/kyc/submissions/${id}/reject`,

  // Calls + bookings
  CALLS:                      `${ADMIN}/calls`,
  CALL:                       (id: string) => `${ADMIN}/calls/${id}`,
  CALL_FORCE_END:             (id: string) => `${ADMIN}/calls/${id}/force-end`,
  CALL_REFUND:                (id: string) => `${ADMIN}/calls/${id}/refund`,
  CALL_TEST_INIT:             `${ADMIN}/calls/test-init`,
  BOOKINGS:                   `${ADMIN}/bookings`,

  // Wallet read paths
  WALLET_FOR_USER:            (userId: string) => `${ADMIN}/wallets/users/${userId}`,
  WALLET_ACCOUNTS:            `${ADMIN}/wallets/accounts`,
  WALLET_ACCOUNT:             (code: string) => `${ADMIN}/wallets/accounts/${code}`,
  WALLET_JOURNALS:            `${ADMIN}/wallets/journals`,
  WALLET_JOURNAL:             (id: string) => `${ADMIN}/wallets/journals/${id}`,
  WALLET_RECONCILIATION:      `${ADMIN}/wallets/reconciliation/run`,
  WALLET_PAYSTACK_WEBHOOKS:   `${ADMIN}/wallets/paystack-webhooks`,
  WALLET_PAYSTACK_FEES:       `${ADMIN}/wallets/paystack-fees-summary`,
  WALLET_PLATFORM_REVENUE:    `${ADMIN}/wallets/platform-revenue-summary`,

  // Wallet writes
  WALLET_MANUAL_JOURNAL:      `${ADMIN}/wallets/manual-journal`,
  WALLET_CREDIT:              `${ADMIN}/wallets/credit`,
  WALLET_DEBIT:               `${ADMIN}/wallets/debit`,
  WALLET_REPLAY_WEBHOOK:      `${ADMIN}/wallets/replay-webhook`,

  // Refunds
  REFUNDS:                    `${ADMIN}/refunds`,
  REFUND_APPROVE:             (id: string) => `${ADMIN}/refunds/${id}/approve`,
  REFUND_REJECT:              (id: string) => `${ADMIN}/refunds/${id}/reject`,

  // Withdrawals
  WITHDRAWALS:                `${ADMIN}/withdrawals`,
  WITHDRAWAL_APPROVE:         (id: string) => `${ADMIN}/withdrawals/${id}/approve`,
  WITHDRAWAL_REJECT:          (id: string) => `${ADMIN}/withdrawals/${id}/reject`,
  WITHDRAWAL_FORCE_FAIL:      (id: string) => `${ADMIN}/withdrawals/${id}/force-fail`,

  // Transactions + payouts
  TRANSACTIONS:               `${ADMIN}/transactions`,
  TRANSACTION:                (id: string) => `${ADMIN}/transactions/${id}`,
  PAYOUTS_SYNC:               `${ADMIN}/payouts/sync`,

  // Reports
  REPORTS:                    `${ADMIN}/reports`,
  REPORT_RESOLVE:             (id: string) => `${ADMIN}/reports/${id}/resolve`,
  REPORT_DISMISS:             (id: string) => `${ADMIN}/reports/${id}/dismiss`,

  // Content: legal + FAQs
  LEGAL_LIST:                 (kind: string) => `${ADMIN}/legal/${kind}`,
  LEGAL_PUBLISH:              (kind: string) => `${ADMIN}/legal/${kind}`,
  FAQS:                       `${ADMIN}/faqs`,
  FAQ:                        (id: string) => `${ADMIN}/faqs/${id}`,

  // Banners — mounted on the banners feature, admin sub-router.
  BANNERS:                    `${BASE}/banners/admin`,
  BANNER:                     (id: string) => `${BASE}/banners/admin/${id}`,
  BANNER_ACTIVATE:            (id: string) => `${BASE}/banners/admin/${id}/activate`,
  BANNER_DEACTIVATE:          (id: string) => `${BASE}/banners/admin/${id}/deactivate`,

  // Foundations
  AUDIT_LOG:                  `${ADMIN}/audit-log`,
  CONFIG:                     `${ADMIN}/config`,

  // Reviews moderation — mounted on reviews feature.
  REVIEWS:                    `${BASE}/admin/reviews`,
  REVIEW:                     (id: string) => `${BASE}/admin/reviews/${id}`,
  REVIEW_HIDE:                (id: string) => `${BASE}/admin/reviews/${id}/hide`,
  REVIEW_UNHIDE:              (id: string) => `${BASE}/admin/reviews/${id}/unhide`,

  // Strikes — mounted on strikes feature.
  STRIKES:                    `${BASE}/admin/strikes`,
  STRIKE_ISSUE:               `${BASE}/admin/strikes`,
  STRIKE:                     (id: string) => `${BASE}/admin/strikes/${id}`,
  STRIKE_UPHOLD:              (id: string) => `${BASE}/admin/strikes/${id}/uphold`,
  STRIKE_VOID:                (id: string) => `${BASE}/admin/strikes/${id}/void`,
} as const;
