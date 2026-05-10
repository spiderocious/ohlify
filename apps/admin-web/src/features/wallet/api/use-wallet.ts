import { useQueryClient } from '@tanstack/react-query';

import {
  ADMIN_EP,
  type AdminAccountSummaryView,
  type AdminAccountView,
  type AdminJournalSummary,
  type AdminUserWalletView,
} from '@ohlify/api';

import { useAdminMutation } from '../../../shared/api/use-admin-mutation.js';
import { useAdminQuery } from '../../../shared/api/use-admin-query.js';
import { useCursorList } from '../../../shared/api/use-cursor-list.js';

// ── Read paths ────────────────────────────────────────────────────────────────

export function useUserWallet(userId: string | null) {
  return useAdminQuery<AdminUserWalletView>({
    key: ['admin', 'wallet', 'user', userId],
    url: userId ? ADMIN_EP.WALLET_FOR_USER(userId) : '',
    enabled: Boolean(userId),
  });
}

export function useSystemAccounts(kind: string = 'all') {
  return useAdminQuery<AdminAccountView[]>({
    key: ['admin', 'wallet', 'accounts', kind],
    url: ADMIN_EP.WALLET_ACCOUNTS,
    searchParams: { kind },
    staleTime: 30_000,
  });
}

export function useSystemAccount(code: string | null) {
  return useAdminQuery<AdminAccountView>({
    key: ['admin', 'wallet', 'account', code],
    url: code ? ADMIN_EP.WALLET_ACCOUNT(code) : '',
    enabled: Boolean(code),
  });
}

type JournalsFilters = {
  kind?: string;
  user_id?: string;
  call_id?: string;
  [k: string]: string | undefined;
};

export function useJournals(filters: JournalsFilters) {
  return useCursorList<AdminJournalSummary>({
    key: ['admin', 'wallet', 'journals'],
    url: ADMIN_EP.WALLET_JOURNALS,
    filters,
  });
}

export function useJournalDetail(id: string | null) {
  return useAdminQuery<AdminJournalSummary & { entries?: unknown[] }>({
    key: ['admin', 'wallet', 'journal', id],
    url: id ? ADMIN_EP.WALLET_JOURNAL(id) : '',
    enabled: Boolean(id),
  });
}

export function useReconciliation(enabled = false) {
  // Backend reconciliation shape is open; we render whatever it returns.
  return useAdminQuery<unknown>({
    key: ['admin', 'wallet', 'reconciliation'],
    url: ADMIN_EP.WALLET_RECONCILIATION,
    enabled,
    staleTime: 60_000,
  });
}

// SummaryWindowQuerySchema requires YYYY-MM-DD strings.
type WindowParams = { from?: string; to?: string };

export function usePaystackFeesSummary(params: WindowParams) {
  return useAdminQuery<AdminAccountSummaryView>({
    key: ['admin', 'wallet', 'paystack-fees', params],
    url: ADMIN_EP.WALLET_PAYSTACK_FEES,
    searchParams: params,
    staleTime: 60_000,
  });
}

export function usePlatformRevenueSummary(params: WindowParams) {
  return useAdminQuery<AdminAccountSummaryView>({
    key: ['admin', 'wallet', 'platform-revenue', params],
    url: ADMIN_EP.WALLET_PLATFORM_REVENUE,
    searchParams: params,
    staleTime: 60_000,
  });
}

// ── Writes ───────────────────────────────────────────────────────────────────

interface ManualJournalLine {
  account_code: string;
  user_id?: string | null;
  amount_kobo: number;
  memo?: string;
}

export function usePostManualJournal() {
  const qc = useQueryClient();
  return useAdminMutation<{
    description: string;
    idempotency_key: string;
    lines: ManualJournalLine[];
  }>(
    { method: 'post', url: ADMIN_EP.WALLET_MANUAL_JOURNAL },
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'wallet'] }) },
  );
}

export function useAdminCredit() {
  const qc = useQueryClient();
  return useAdminMutation<{
    user_id: string;
    amount_kobo: number;
    memo: string;
    idempotency_key: string;
  }>(
    { method: 'post', url: ADMIN_EP.WALLET_CREDIT },
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'wallet'] }) },
  );
}

export function useAdminDebit() {
  const qc = useQueryClient();
  return useAdminMutation<{
    user_id: string;
    amount_kobo: number;
    memo: string;
    idempotency_key: string;
  }>(
    { method: 'post', url: ADMIN_EP.WALLET_DEBIT },
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'wallet'] }) },
  );
}
