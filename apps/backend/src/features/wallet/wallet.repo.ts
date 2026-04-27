import { pool } from '@lib/db/pool.js';

export interface TransactionRow {
  entry_id: string;
  journal_id: string;
  journal_kind: string;
  signed_amount_kobo: string;
  currency: string;
  occurred_at: Date;
  reference: string | null;
  related_call_id: string | null;
  related_payment_id: string | null;
  related_withdrawal_id: string | null;
  memo: string | null;
}

interface ListTransactionsInput {
  userId: string;
  limit: number;
  cursor?: { last_id: string; last_sort_key: string };
}

// Lists all wallet_entries hitting the user's wallet account, ordered by
// created_at DESC, with the journal kind + reference (from the optionally-
// linked payments row) joined for client-friendly rendering.
export const listUserTransactions = async (
  input: ListTransactionsInput,
): Promise<TransactionRow[]> => {
  const params: unknown[] = [input.userId];
  let cursorClause = '';
  if (input.cursor !== undefined) {
    params.push(input.cursor.last_sort_key);
    params.push(input.cursor.last_id);
    cursorClause = `
      AND (
        we.created_at < $${params.length - 1}::timestamptz
        OR (we.created_at = $${params.length - 1}::timestamptz AND we.id < $${params.length})
      )
    `;
  }
  params.push(input.limit + 1);
  const limitParam = `$${params.length}`;

  const sql = `
    SELECT
      we.id              AS entry_id,
      we.journal_id      AS journal_id,
      je.kind::text      AS journal_kind,
      we.signed_amount_kobo::text AS signed_amount_kobo,
      we.currency        AS currency,
      we.created_at      AS occurred_at,
      p.reference        AS reference,
      je.related_call_id,
      je.related_payment_id,
      je.related_withdrawal_id,
      je.memo
    FROM wallet_entries we
    JOIN journal_entries je ON je.id = we.journal_id
    JOIN accounts a ON a.id = we.account_id AND a.kind = 'user' AND a.owner_user_id = $1
    LEFT JOIN payments p ON p.id = je.related_payment_id
    WHERE TRUE
      ${cursorClause}
    ORDER BY we.created_at DESC, we.id DESC
    LIMIT ${limitParam}
  `;

  const res = await pool.query<TransactionRow>(sql, params);
  return res.rows;
};

// Stats: this_week_kobo + this_month_kobo for the user's wallet.
// total_calls is hardcoded to 0 here — depends on §8 (calls) which isn't shipped.
export interface WalletStatsRow {
  this_week_kobo: string;
  this_month_kobo: string;
}

export const readUserWalletStats = async (userId: string): Promise<WalletStatsRow> => {
  const res = await pool.query<WalletStatsRow>(
    `WITH wallet AS (
       SELECT id FROM accounts WHERE kind = 'user' AND owner_user_id = $1 LIMIT 1
     )
     SELECT
       COALESCE(SUM(CASE WHEN we.created_at >= date_trunc('week', now())
                         THEN we.signed_amount_kobo ELSE 0 END), 0)::text AS this_week_kobo,
       COALESCE(SUM(CASE WHEN we.created_at >= date_trunc('month', now())
                         THEN we.signed_amount_kobo ELSE 0 END), 0)::text AS this_month_kobo
     FROM wallet_entries we
     WHERE we.account_id = (SELECT id FROM wallet)`,
    [userId],
  );
  return res.rows[0] ?? { this_week_kobo: '0', this_month_kobo: '0' };
};
