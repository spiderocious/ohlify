import { route } from '@ohlify/core';

/**
 * Admin-web route table. Mirrors the backend admin surface 1:1 so deep links
 * are always type-safe (`ADMIN_ROUTES.USERS.DETAIL.build({ id })`). Each
 * top-level segment maps to a feature folder under `src/features/`.
 *
 * Keep in sync with `src/shared/config/nav-items.ts` — that file decides
 * which of these show up in the sidebar and to which roles.
 */
export const ADMIN_ROUTES = route('', {
  ROOT: route(''),

  // Auth — public (no shell)
  LOGIN: route('login'),
  TOTP_SETUP: route('totp-setup'),

  // Protected app
  DASHBOARD: route('dashboard'),

  USERS: route('users', {
    DETAIL: route(':id'),
  }),

  KYC: route('kyc', {
    DETAIL: route(':id'),
  }),

  CALLS: route('calls', {
    DETAIL: route(':id'),
  }),
  BOOKINGS: route('bookings'),

  WALLETS: route('wallets', {
    ACCOUNTS: route('accounts'),
    ACCOUNT_DETAIL: route('accounts/:code'),
    JOURNALS: route('journals'),
    JOURNAL_DETAIL: route('journals/:id'),
    USER_WALLET: route('users/:userId'),
    RECONCILIATION: route('reconciliation'),
    MANUAL_JOURNAL: route('manual-journal'),
  }),

  TRANSACTIONS: route('transactions', {
    DETAIL: route(':id'),
  }),

  WITHDRAWALS: route('withdrawals'),
  REFUNDS: route('refunds'),

  WEBHOOKS: route('webhooks'),

  REPORTS: route('reports'),

  REVIEWS: route('reviews', {
    DETAIL: route(':id'),
  }),

  STRIKES: route('strikes', {
    DETAIL: route(':id'),
  }),

  CONTENT: route('content', {
    BANNERS: route('banners'),
    LEGAL: route('legal'),
    FAQS: route('faqs'),
  }),

  CONFIG: route('config'),

  AUDIT_LOG: route('audit-log'),
});
