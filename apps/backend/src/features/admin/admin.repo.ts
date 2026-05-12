import { pool } from '@lib/db/pool.js';
import type { AccountRow } from '@lib/wallet/accounts.js';

export interface AccountWithBalance extends AccountRow {
  balance_kobo: string;
}

export const listAccountsWithBalances = async (
  kind: 'user' | 'system' | 'liability' | 'all',
): Promise<AccountWithBalance[]> => {
  const filter = kind === 'all' ? `` : `WHERE a.kind = $1`;
  const params = kind === 'all' ? [] : [kind];
  const res = await pool.query<AccountWithBalance>(
    `SELECT
       a.id, a.kind, a.owner_user_id, a.system_code, a.currency, a.label, a.is_active,
       COALESCE(b.balance_kobo, 0)::text AS balance_kobo
     FROM accounts a
     LEFT JOIN account_balances b ON b.account_id = a.id
     ${filter}
     ORDER BY a.kind, a.system_code NULLS LAST, a.id`,
    params,
  );
  return res.rows;
};

export const findAccountWithBalance = async (
  accountId: string,
): Promise<AccountWithBalance | null> => {
  const res = await pool.query<AccountWithBalance>(
    `SELECT
       a.id, a.kind, a.owner_user_id, a.system_code, a.currency, a.label, a.is_active,
       COALESCE(b.balance_kobo, 0)::text AS balance_kobo
     FROM accounts a
     LEFT JOIN account_balances b ON b.account_id = a.id
     WHERE a.id = $1
     LIMIT 1`,
    [accountId],
  );
  return res.rows[0] ?? null;
};

export interface JournalRow {
  id: string;
  kind: string;
  idempotency_key: string;
  related_call_id: string | null;
  related_payment_id: string | null;
  related_withdrawal_id: string | null;
  related_user_id: string | null;
  memo: string | null;
  created_by_admin_id: string | null;
  created_at: Date;
}

export const findJournalsForUser = async (userId: string, limit: number): Promise<JournalRow[]> => {
  const res = await pool.query<JournalRow>(
    `SELECT * FROM journal_entries
      WHERE related_user_id = $1
      ORDER BY created_at DESC
      LIMIT $2`,
    [userId, limit],
  );
  return res.rows;
};

interface ListJournalsInput {
  limit: number;
  cursor?: { last_id: string; last_sort_key: string };
  kind?: string;
  userId?: string;
  callId?: string;
}

export const listJournals = async (input: ListJournalsInput): Promise<JournalRow[]> => {
  const params: unknown[] = [];
  const filters: string[] = [];

  if (input.kind !== undefined) {
    params.push(input.kind);
    filters.push(`kind = $${params.length}::journal_kind`);
  }
  if (input.userId !== undefined) {
    params.push(input.userId);
    filters.push(`related_user_id = $${params.length}`);
  }
  if (input.callId !== undefined) {
    params.push(input.callId);
    filters.push(`related_call_id = $${params.length}`);
  }
  if (input.cursor !== undefined) {
    params.push(input.cursor.last_sort_key);
    params.push(input.cursor.last_id);
    filters.push(
      `(created_at < $${params.length - 1}::timestamptz OR (created_at = $${params.length - 1}::timestamptz AND id < $${params.length}))`,
    );
  }

  const where = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
  params.push(input.limit + 1);

  const res = await pool.query<JournalRow>(
    `SELECT * FROM journal_entries
       ${where}
      ORDER BY created_at DESC, id DESC
      LIMIT $${params.length}`,
    params,
  );
  return res.rows;
};

export const findJournalById = async (journalId: string): Promise<JournalRow | null> => {
  const res = await pool.query<JournalRow>(`SELECT * FROM journal_entries WHERE id = $1 LIMIT 1`, [
    journalId,
  ]);
  return res.rows[0] ?? null;
};

export interface JournalLineRow {
  id: string;
  account_id: string;
  account_label: string;
  signed_amount_kobo: string;
  currency: string;
}

export const findLinesForJournal = async (journalId: string): Promise<JournalLineRow[]> => {
  const res = await pool.query<JournalLineRow>(
    `SELECT we.id,
            we.account_id,
            a.label AS account_label,
            we.signed_amount_kobo::text,
            we.currency
       FROM wallet_entries we
       JOIN accounts a ON a.id = we.account_id
      WHERE we.journal_id = $1
      ORDER BY we.id`,
    [journalId],
  );
  return res.rows;
};

// Reconciliation: per-account ledger sum vs cached balance.
export interface DriftRow {
  account_id: string;
  account_label: string;
  cached_balance_kobo: string;
  ledger_sum_kobo: string;
  drift_kobo: string;
}

export const reconcile = async (): Promise<DriftRow[]> => {
  const res = await pool.query<DriftRow>(
    `SELECT
       a.id AS account_id,
       a.label AS account_label,
       COALESCE(b.balance_kobo, 0)::text AS cached_balance_kobo,
       COALESCE(SUM(we.signed_amount_kobo), 0)::text AS ledger_sum_kobo,
       (COALESCE(SUM(we.signed_amount_kobo), 0) - COALESCE(b.balance_kobo, 0))::text AS drift_kobo
     FROM accounts a
     LEFT JOIN account_balances b ON b.account_id = a.id
     LEFT JOIN wallet_entries we ON we.account_id = a.id
     GROUP BY a.id, a.label, b.balance_kobo
     HAVING COALESCE(SUM(we.signed_amount_kobo), 0) <> COALESCE(b.balance_kobo, 0)
     ORDER BY a.id`,
  );
  return res.rows;
};

// System-account totals for accounting summaries (paystack_fees, platform_revenue).
export const sumAccountInWindow = async (
  accountId: string,
  from: Date | null,
  to: Date | null,
): Promise<string> => {
  const params: unknown[] = [accountId];
  const filters: string[] = ['account_id = $1'];
  if (from) {
    params.push(from);
    filters.push(`created_at >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    filters.push(`created_at < $${params.length}`);
  }
  const res = await pool.query<{ total: string }>(
    `SELECT COALESCE(SUM(signed_amount_kobo), 0)::text AS total
       FROM wallet_entries
      WHERE ${filters.join(' AND ')}`,
    params,
  );
  return res.rows[0]?.total ?? '0';
};

// paystack_webhooks listing for forensics.
export interface WebhookSummaryRow {
  id: string;
  event_id: string;
  event_type: string;
  received_at: Date;
  processed_at: Date | null;
  processing_error: string | null;
  replay_count: number;
}

export const listWebhooks = async (limit: number): Promise<WebhookSummaryRow[]> => {
  const res = await pool.query<WebhookSummaryRow>(
    `SELECT id, event_id, event_type, received_at, processed_at, processing_error, replay_count
       FROM paystack_webhooks
      ORDER BY received_at DESC
      LIMIT $1`,
    [limit],
  );
  return res.rows;
};
