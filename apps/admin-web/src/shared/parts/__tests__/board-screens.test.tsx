import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { statusFor, statusTabs } from '../board-status.js';

/**
 * Render sweep over the migrated board screens.
 *
 * Sixteen screens moved onto Hawk in one pass. The type-checker cannot see a
 * key collision in a mapped column, a component that throws because a required
 * child is missing, or invalid DOM nesting — all of which are runtime failures
 * on code that compiles perfectly.
 *
 * Every screen is mounted with its data hooks stubbed empty. That is the state
 * a screen is in for the first paint of every visit, and it is the one most
 * likely to hit an unguarded `.length` or a `.map` over undefined.
 */

const emptyList = {
  items: [],
  isLoading: false,
  isFetching: false,
  error: null,
  hasNext: false,
  hasPrev: false,
  goNext: () => undefined,
  goPrev: () => undefined,
  reset: () => undefined,
  refetch: () => undefined,
};

const emptyQuery = {
  data: undefined,
  isLoading: false,
  isFetching: false,
  error: null,
  refetch: () => undefined,
};

const noopMutation = () => ({ mutate: () => undefined, isPending: false });

vi.mock('../../../features/withdrawals/api/use-withdrawals.js', () => ({
  useWithdrawals: () => emptyList,
  useSyncPayouts: noopMutation,
  useApproveWithdrawal: noopMutation,
  useRejectWithdrawal: noopMutation,
  useForceFailWithdrawal: noopMutation,
  useBulkWithdrawalAction: () => ({ mutate: () => undefined, isPending: false }),
}));

vi.mock('../../../features/refunds/api/use-refunds.js', () => ({
  useRefunds: () => emptyList,
  useApproveRefund: noopMutation,
  useRejectRefund: noopMutation,
}));

vi.mock('../../../features/transactions/api/use-transactions.js', () => ({
  useTransactions: () => emptyList,
  useTransaction: () => emptyQuery,
}));

vi.mock('../../../features/kyc/api/use-kyc.js', () => ({
  useKycSubmissions: () => emptyList,
  useApproveKyc: noopMutation,
  useRejectKyc: noopMutation,
}));

vi.mock('../../../features/reports/api/use-reports.js', () => ({
  useReports: () => emptyList,
  useResolveReport: noopMutation,
  useDismissReport: noopMutation,
}));

vi.mock('../../../features/reviews/api/use-reviews.js', () => ({
  useReviews: () => emptyList,
  // The detail drawer mounts alongside the list even when closed.
  useReviewDetail: () => emptyQuery,
  useHideReview: noopMutation,
  useUnhideReview: noopMutation,
}));

vi.mock('../../../features/strikes/api/use-strikes.js', () => ({
  useStrikes: () => emptyList,
  useStrikeDetail: () => emptyQuery,
  useIssueStrike: noopMutation,
  useRevokeStrike: noopMutation,
  useUpholdStrike: noopMutation,
  useVoidStrike: noopMutation,
}));

vi.mock('../../../features/calls/api/use-calls.js', () => ({
  useAdminCalls: () => emptyList,
  useAdminBookings: () => emptyList,
  useTestInitCall: noopMutation,
  useAdminCall: () => emptyQuery,
  useForceEndCall: noopMutation,
  useRefundCall: noopMutation,
}));

vi.mock('../../../features/wallet/api/use-wallet.js', () => ({
  useSystemAccounts: () => emptyQuery,
  useSystemAccount: () => emptyQuery,
  useJournals: () => emptyList,
  useJournalDetail: () => emptyQuery,
  useReconciliation: () => ({ ...emptyQuery, isFetching: false }),
  usePaystackFeesSummary: () => emptyQuery,
  usePlatformRevenueSummary: () => emptyQuery,
}));

vi.mock('../../../features/audit-log/api/use-audit.js', () => ({
  useAuditLog: () => emptyList,
}));

function withProviders(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('the migrated board screens', () => {
  let errors: string[] = [];
  let originalError: typeof console.error;

  beforeEach(() => {
    errors = [];
    originalError = console.error;
    console.error = (...args: unknown[]) => {
      errors.push(args.map(String).join(' '));
    };
    window.scrollTo = vi.fn();
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    console.error = originalError;
    cleanup();
  });

  const cases: Array<[string, () => Promise<{ default?: unknown } & Record<string, unknown>>, string, string]> =
    [
      ['withdrawals', () => import('../../../features/withdrawals/screens/withdrawals-list-screen.js'), 'WithdrawalsListScreen', 'Withdrawals'],
      ['refunds', () => import('../../../features/refunds/screens/refunds-list-screen.js'), 'RefundsListScreen', 'Refunds'],
      ['transactions', () => import('../../../features/transactions/screens/transactions-list-screen.js'), 'TransactionsListScreen', 'Transactions'],
      ['kyc queue', () => import('../../../features/kyc/screens/kyc-list-screen.js'), 'KycListScreen', 'KYC review'],
      ['reports', () => import('../../../features/reports/screens/reports-list-screen.js'), 'ReportsListScreen', 'Reports'],
      ['reviews', () => import('../../../features/reviews/screens/reviews-list-screen.js'), 'ReviewsListScreen', 'Reviews'],
      ['strikes', () => import('../../../features/strikes/screens/strikes-list-screen.js'), 'StrikesListScreen', 'Strikes'],
      ['calls', () => import('../../../features/calls/screens/calls-list-screen.js'), 'CallsListScreen', 'Calls'],
      ['bookings', () => import('../../../features/calls/screens/bookings-list-screen.js'), 'BookingsListScreen', 'Bookings'],
      ['wallet overview', () => import('../../../features/wallet/screens/wallet-overview-screen.js'), 'WalletOverviewScreen', 'Wallet overview'],
      ['system accounts', () => import('../../../features/wallet/screens/system-accounts-screen.js'), 'SystemAccountsScreen', 'System accounts'],
      ['journals', () => import('../../../features/wallet/screens/journals-list-screen.js'), 'JournalsListScreen', 'Journals'],
      ['reconciliation', () => import('../../../features/wallet/screens/reconciliation-screen.js'), 'ReconciliationScreen', 'Reconciliation'],
      ['audit log', () => import('../../../features/audit-log/screens/audit-log-screen.js'), 'AuditLogScreen', 'Audit log'],
    ];

  for (const [name, load, exportName, heading] of cases) {
    it(`renders ${name} clean`, async () => {
      const mod = await load();
      const Screen = mod[exportName] as () => React.ReactElement;
      render(withProviders(<Screen />));

      expect(screen.getAllByText(heading).length).toBeGreaterThan(0);
      expect(errors).toEqual([]);
    });
  }
});

describe('the shared status registry', () => {
  it('maps every family the console renders', () => {
    // Hawk names states in user language, the schema in system language.
    // These are the pairs that would otherwise render as raw enum values.
    expect(statusFor('withdrawal', 'completed').label).toBe('Paid');
    expect(statusFor('kyc', 'pending_review').label).toBe('Under review');
    expect(statusFor('call', 'no_show_caller').label).toBe('Caller no-show');
    expect(statusFor('booking', 'pending').label).toBe('Awaiting payment');
    expect(statusFor('webhook', 'unprocessed').label).toBe('Unprocessed');
  });

  it('keeps instant and scheduled call vocabularies apart', () => {
    // Two enums, two meanings: `active` is a live instant call, but a
    // scheduled call in progress is `in_progress`.
    expect(statusFor('instantCall', 'active').label).toBe('Live');
    expect(statusFor('call', 'in_progress').label).toBe('In progress');
  });

  it('covers both transaction vocabularies', () => {
    // Payments speak Paystack's words, journals speak the ledger's.
    expect(statusFor('transaction', 'success').label).toBe('Success');
    expect(statusFor('transaction', 'completed').label).toBe('Completed');
    expect(statusFor('transaction', 'abandoned').label).toBe('Abandoned');
  });

  it('falls back rather than rendering an unlabelled badge', () => {
    expect(statusFor('user', 'some_future_state').label).toBe('Some future state');
    expect(statusFor('user', null).label).toBe('—');
    expect(statusFor('user', '').label).toBe('—');
  });

  it('builds tabs with an All entry first', () => {
    const tabs = statusTabs('refund');
    expect(tabs[0]).toEqual({ value: '', label: 'All' });
    expect(tabs.map((tab) => tab.value)).toContain('pending');
  });

  it('honours the exclude list', () => {
    const tabs = statusTabs('user', { exclude: ['deleted'] });
    expect(tabs.map((tab) => tab.value)).not.toContain('deleted');
  });
});
