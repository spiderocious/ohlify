import { decodeCursor, encodeCursor, resolveLimit } from '@lib/pagination.js';
import { ServiceError, ServiceSuccess } from '@lib/service-result.js';
import {
  accountFor,
  findUserWalletByUserId,
  readUserAvailableBalance,
  readUserPendingBalance,
} from '@lib/wallet/index.js';
import { MESSAGE_KEYS } from '@shared/constants/message-keys.js';

import * as repo from './admin.repo.js';
import type {
  AdminAccountSummaryView,
  AdminAccountView,
  AdminJournalDetail,
  AdminJournalSummary,
  AdminPaystackWebhookSummary,
  AdminReconciliationReport,
  AdminUserWalletView,
} from './admin.types.js';

const toAccountView = (row: repo.AccountWithBalance): AdminAccountView => ({
  id: row.id,
  kind: row.kind,
  owner_user_id: row.owner_user_id,
  system_code: row.system_code,
  currency: row.currency,
  label: row.label,
  balance_kobo: Number(row.balance_kobo),
  is_active: row.is_active,
});

const toJournalSummary = (row: repo.JournalRow): AdminJournalSummary => ({
  id: row.id,
  kind: row.kind,
  idempotency_key: row.idempotency_key,
  related_call_id: row.related_call_id,
  related_payment_id: row.related_payment_id,
  related_withdrawal_id: row.related_withdrawal_id,
  related_user_id: row.related_user_id,
  memo: row.memo,
  created_by_admin_id: row.created_by_admin_id,
  created_at: row.created_at.toISOString(),
});

// ── GET /admin/wallets/users/:userId ────────────────────────────────────────

export const getUserWallet = async (userId: string) => {
  const account = await findUserWalletByUserId(userId);
  if (!account) {
    return new ServiceError('not_found', MESSAGE_KEYS.ADMIN_WALLET_FETCHED, 404);
  }
  const [available, pending, recent] = await Promise.all([
    readUserAvailableBalance(userId),
    readUserPendingBalance(userId),
    repo.findJournalsForUser(userId, 25),
  ]);

  const view: AdminUserWalletView = {
    user_id: userId,
    account_id: account.id,
    available_kobo: available,
    pending_kobo: pending,
    withdrawable_kobo: available,
    currency: account.currency,
    recent_journals: recent.map(toJournalSummary),
  };
  return new ServiceSuccess(view, MESSAGE_KEYS.ADMIN_WALLET_FETCHED);
};

// ── GET /admin/wallets/accounts ─────────────────────────────────────────────

export const listAccounts = async (kind: 'user' | 'system' | 'liability' | 'all') => {
  const rows = await repo.listAccountsWithBalances(kind);
  return new ServiceSuccess(rows.map(toAccountView), MESSAGE_KEYS.ADMIN_ACCOUNTS_LIST_FETCHED);
};

// ── GET /admin/wallets/accounts/:code ───────────────────────────────────────
// Resolves a system account by its stable code.

export const getSystemAccount = async (code: string) => {
  // accountFor.system has its own cache + throws on missing; downgrade the
  // throw into a 404 service error here.
  try {
    const acct = await accountFor.system(code as Parameters<typeof accountFor.system>[0]);
    const withBalance = await repo.findAccountWithBalance(acct.id);
    if (!withBalance) {
      return new ServiceError('not_found', MESSAGE_KEYS.ADMIN_ACCOUNT_FETCHED, 404);
    }
    return new ServiceSuccess(toAccountView(withBalance), MESSAGE_KEYS.ADMIN_ACCOUNT_FETCHED);
  } catch {
    return new ServiceError('not_found', MESSAGE_KEYS.ADMIN_ACCOUNT_FETCHED, 404);
  }
};

// ── GET /admin/wallets/journals ─────────────────────────────────────────────

export interface ListJournalsDto {
  cursor?: string | undefined;
  limit?: number | undefined;
  kind?: string | undefined;
  user_id?: string | undefined;
  call_id?: string | undefined;
}

export const listJournals = async (dto: ListJournalsDto) => {
  const limit = resolveLimit(dto.limit);
  let cursor: { last_id: string; last_sort_key: string } | undefined;
  if (dto.cursor !== undefined) {
    try {
      cursor = decodeCursor(dto.cursor);
    } catch {
      return new ServiceError('validation_error', MESSAGE_KEYS.ADMIN_JOURNALS_LIST_FETCHED, 400, {
        cursor: ['Invalid cursor'],
      });
    }
  }

  const rows = await repo.listJournals({
    limit,
    ...(cursor ? { cursor } : {}),
    ...(dto.kind !== undefined ? { kind: dto.kind } : {}),
    ...(dto.user_id !== undefined ? { userId: dto.user_id } : {}),
    ...(dto.call_id !== undefined ? { callId: dto.call_id } : {}),
  });
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const items = page.map(toJournalSummary);
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor({ last_id: last.id, last_sort_key: last.created_at.toISOString() })
      : null;

  return new ServiceSuccess(
    { items, meta: { next_cursor: nextCursor, has_more: hasMore } },
    MESSAGE_KEYS.ADMIN_JOURNALS_LIST_FETCHED,
  );
};

// ── GET /admin/wallets/journals/:id ─────────────────────────────────────────

export const getJournal = async (journalId: string) => {
  const journal = await repo.findJournalById(journalId);
  if (!journal) {
    return new ServiceError('not_found', MESSAGE_KEYS.ADMIN_JOURNAL_FETCHED, 404);
  }
  const lines = await repo.findLinesForJournal(journalId);
  const detail: AdminJournalDetail = {
    ...toJournalSummary(journal),
    lines: lines.map((l) => ({
      id: l.id,
      account_id: l.account_id,
      account_label: l.account_label,
      signed_amount_kobo: Number(l.signed_amount_kobo),
      currency: l.currency,
    })),
  };
  return new ServiceSuccess(detail, MESSAGE_KEYS.ADMIN_JOURNAL_FETCHED);
};

// ── GET /admin/wallets/reconciliation/run ───────────────────────────────────

export const runReconciliation = async () => {
  const drift = await repo.reconcile();
  const report: AdminReconciliationReport = {
    ran_at: new Date().toISOString(),
    ok: drift.length === 0,
    drift: drift.map((row) => ({
      account_id: row.account_id,
      account_label: row.account_label,
      cached_balance_kobo: Number(row.cached_balance_kobo),
      ledger_sum_kobo: Number(row.ledger_sum_kobo),
      drift_kobo: Number(row.drift_kobo),
    })),
  };
  const messageKey = report.ok
    ? MESSAGE_KEYS.ADMIN_RECONCILIATION_OK
    : MESSAGE_KEYS.ADMIN_RECONCILIATION_DRIFT;
  return new ServiceSuccess(report, messageKey);
};

// ── GET /admin/wallets/paystack-webhooks ────────────────────────────────────

export const listWebhooks = async (limit: number) => {
  const rows = await repo.listWebhooks(Math.min(Math.max(limit, 1), 200));
  const items: AdminPaystackWebhookSummary[] = rows.map((row) => ({
    id: row.id,
    event_id: row.event_id,
    event_type: row.event_type,
    received_at: row.received_at.toISOString(),
    processed_at: row.processed_at ? row.processed_at.toISOString() : null,
    processing_error: row.processing_error,
    replay_count: row.replay_count,
  }));
  return new ServiceSuccess(items, MESSAGE_KEYS.ADMIN_PAYSTACK_WEBHOOKS_LIST_FETCHED);
};

// ── GET /admin/wallets/paystack-fees-summary ────────────────────────────────

export const getPaystackFeesSummary = async (from: Date | null, to: Date | null) => {
  const acct = await accountFor.system('paystack_fees');
  const total = await repo.sumAccountInWindow(acct.id, from, to);
  const view: AdminAccountSummaryView = {
    account_id: acct.id,
    total_kobo: Number(total),
    currency: acct.currency,
    from: from ? from.toISOString() : null,
    to: to ? to.toISOString() : null,
  };
  return new ServiceSuccess(view, MESSAGE_KEYS.ADMIN_PAYSTACK_FEES_FETCHED);
};

// ── GET /admin/wallets/platform-revenue-summary ─────────────────────────────

export const getPlatformRevenueSummary = async (from: Date | null, to: Date | null) => {
  const acct = await accountFor.system('platform_revenue');
  const total = await repo.sumAccountInWindow(acct.id, from, to);
  const view: AdminAccountSummaryView = {
    account_id: acct.id,
    total_kobo: Number(total),
    currency: acct.currency,
    from: from ? from.toISOString() : null,
    to: to ? to.toISOString() : null,
  };
  return new ServiceSuccess(view, MESSAGE_KEYS.ADMIN_PLATFORM_REVENUE_FETCHED);
};
