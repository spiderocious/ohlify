import type { PoolClient } from 'pg';

import { pool } from '@lib/db/pool.js';
import { id as makeId } from '@lib/ids.js';

interface QueryRunner {
  query: PoolClient['query'];
}

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

// ── Withdrawals ──────────────────────────────────────────────────────────────

export type WithdrawalStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'reversed';

export interface BankSnapshot {
  account_number: string;
  bank_code: string;
  bank_name: string;
  account_name: string;
}

export interface WithdrawalRow {
  id: string;
  user_id: string;
  amount_kobo: string;
  currency: string;
  status: WithdrawalStatus;
  paystack_recipient_code: string | null;
  paystack_transfer_code: string | null;
  paystack_transfer_id: string | null;
  bank_snapshot: BankSnapshot;
  failure_reason: string | null;
  idempotency_key: string | null;
  requested_at: Date;
  processed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateWithdrawalInput {
  userId: string;
  amountKobo: bigint;
  recipientCode: string | null;
  bankSnapshot: BankSnapshot;
  idempotencyKey: string | null;
}

export const createWithdrawal = async (
  runner: QueryRunner,
  input: CreateWithdrawalInput,
): Promise<WithdrawalRow> => {
  const res = await runner.query<WithdrawalRow>(
    `INSERT INTO withdrawals (
       id, user_id, amount_kobo, paystack_recipient_code, bank_snapshot, idempotency_key
     )
     VALUES ($1, $2, $3, $4, $5::jsonb, $6)
     RETURNING *`,
    [
      makeId('wd'),
      input.userId,
      input.amountKobo.toString(),
      input.recipientCode,
      JSON.stringify(input.bankSnapshot),
      input.idempotencyKey,
    ],
  );
  return res.rows[0]!;
};

export const findWithdrawalByIdempotencyKey = async (
  userId: string,
  idempotencyKey: string,
): Promise<WithdrawalRow | null> => {
  const res = await pool.query<WithdrawalRow>(
    `SELECT * FROM withdrawals WHERE user_id = $1 AND idempotency_key = $2 LIMIT 1`,
    [userId, idempotencyKey],
  );
  return res.rows[0] ?? null;
};

export const findWithdrawalById = async (withdrawalId: string): Promise<WithdrawalRow | null> => {
  const res = await pool.query<WithdrawalRow>(`SELECT * FROM withdrawals WHERE id = $1 LIMIT 1`, [
    withdrawalId,
  ]);
  return res.rows[0] ?? null;
};

export const findWithdrawalByIdForUpdate = async (
  runner: QueryRunner,
  withdrawalId: string,
): Promise<WithdrawalRow | null> => {
  const res = await runner.query<WithdrawalRow>(
    `SELECT * FROM withdrawals WHERE id = $1 LIMIT 1 FOR UPDATE`,
    [withdrawalId],
  );
  return res.rows[0] ?? null;
};

export const findWithdrawalByTransferCode = async (
  runner: QueryRunner,
  transferCode: string,
): Promise<WithdrawalRow | null> => {
  const res = await runner.query<WithdrawalRow>(
    `SELECT * FROM withdrawals WHERE paystack_transfer_code = $1 LIMIT 1 FOR UPDATE`,
    [transferCode],
  );
  return res.rows[0] ?? null;
};

interface ListWithdrawalsInput {
  userId: string;
  limit: number;
  cursor?: { last_id: string; last_sort_key: string };
  status?: WithdrawalStatus;
}

export const listWithdrawalsForUser = async (
  input: ListWithdrawalsInput,
): Promise<WithdrawalRow[]> => {
  const params: unknown[] = [input.userId];
  const filters: string[] = ['user_id = $1'];
  if (input.status !== undefined) {
    params.push(input.status);
    filters.push(`status = $${params.length}::withdrawal_status`);
  }
  if (input.cursor !== undefined) {
    params.push(input.cursor.last_sort_key);
    params.push(input.cursor.last_id);
    filters.push(
      `(requested_at < $${params.length - 1}::timestamptz OR (requested_at = $${params.length - 1}::timestamptz AND id < $${params.length}))`,
    );
  }
  params.push(input.limit + 1);
  const res = await pool.query<WithdrawalRow>(
    `SELECT * FROM withdrawals
       WHERE ${filters.join(' AND ')}
       ORDER BY requested_at DESC, id DESC
       LIMIT $${params.length}`,
    params,
  );
  return res.rows;
};

export const setWithdrawalProcessing = async (
  runner: QueryRunner,
  withdrawalId: string,
  transferCode: string,
  paystackId: string | null,
): Promise<void> => {
  await runner.query(
    `UPDATE withdrawals
        SET status = 'processing',
            paystack_transfer_code = $2,
            paystack_transfer_id = $3,
            updated_at = now()
      WHERE id = $1`,
    [withdrawalId, transferCode, paystackId],
  );
};

export const setWithdrawalCompleted = async (
  runner: QueryRunner,
  withdrawalId: string,
): Promise<void> => {
  await runner.query(
    `UPDATE withdrawals
        SET status = 'completed',
            processed_at = now(),
            updated_at = now()
      WHERE id = $1`,
    [withdrawalId],
  );
};

export const setWithdrawalFailed = async (
  runner: QueryRunner,
  withdrawalId: string,
  reason: string,
): Promise<void> => {
  await runner.query(
    `UPDATE withdrawals
        SET status = 'failed',
            failure_reason = $2,
            processed_at = now(),
            updated_at = now()
      WHERE id = $1`,
    [withdrawalId, reason],
  );
};

export const setWithdrawalReversed = async (
  runner: QueryRunner,
  withdrawalId: string,
  reason: string,
): Promise<void> => {
  await runner.query(
    `UPDATE withdrawals
        SET status = 'reversed',
            failure_reason = COALESCE(failure_reason, $2),
            processed_at = COALESCE(processed_at, now()),
            updated_at = now()
      WHERE id = $1`,
    [withdrawalId, reason],
  );
};

export const countWithdrawalsTodayForUser = async (
  userId: string,
): Promise<{ count: number; sumKobo: bigint }> => {
  const res = await pool.query<{ count: string; sum_kobo: string }>(
    `SELECT count(*)::text AS count,
            COALESCE(SUM(amount_kobo), 0)::text AS sum_kobo
       FROM withdrawals
      WHERE user_id = $1
        AND requested_at >= date_trunc('day', now())
        AND status NOT IN ('failed', 'reversed')`,
    [userId],
  );
  const row = res.rows[0]!;
  return { count: Number(row.count), sumKobo: BigInt(row.sum_kobo) };
};

export const lastWithdrawalRequestAtForUser = async (userId: string): Promise<Date | null> => {
  const res = await pool.query<{ requested_at: Date }>(
    `SELECT requested_at FROM withdrawals
      WHERE user_id = $1
      ORDER BY requested_at DESC
      LIMIT 1`,
    [userId],
  );
  return res.rows[0]?.requested_at ?? null;
};

export const setWithdrawalRecipient = async (
  userId: string,
  recipientCode: string,
): Promise<void> => {
  await pool.query(
    `UPDATE bank_accounts SET paystack_recipient_code = $2, updated_at = now()
      WHERE user_id = $1`,
    [userId, recipientCode],
  );
};

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

/**
 * One wallet entry, with the journal it belongs to. The detail endpoint's
 * anchor read.
 *
 * Scoped by `owner_user_id` in the JOIN rather than filtered afterwards, so a
 * caller asking for someone else's entry gets nothing rather than a row they
 * are then trusted not to look at.
 */
export const findUserTransaction = async (
  userId: string,
  entryId: string,
): Promise<TransactionRow | null> => {
  const res = await pool.query<TransactionRow>(
    `SELECT
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
    WHERE we.id = $2
    LIMIT 1`,
    [userId, entryId],
  );
  return res.rows[0] ?? null;
};

export interface LedgerStepRow {
  journal_kind: string;
  occurred_at: Date;
  /** Positive magnitude — the direction is carried by the step's own label. */
  amount_kobo: string;
  /** True when this line credited or debited the requesting user's own wallet. */
  is_own_wallet: boolean;
}

/**
 * Every journal written for one call, in order — the escrow lifecycle.
 *
 * "Where did my money go for those four minutes" is the commonest support
 * question a marketplace gets, and the answer is spread across several
 * journals: the reserve, the settlement to the professional, the platform's
 * cut, and any unused remainder returned. They share a `related_call_id`,
 * which is what makes this reconstructable without storing a second copy of
 * the story.
 *
 * Reads the *platform's* view, not just the caller's lines: a client who paid
 * ₦37,500 needs to see the split, and their own wallet only ever shows the
 * debit and the refund. System accounts have no `owner_user_id`, so nothing
 * here leaks another user's identity.
 */
export const listCallLedger = async (
  userId: string,
  callId: string,
): Promise<LedgerStepRow[]> => {
  const res = await pool.query<LedgerStepRow>(
    `SELECT
       je.kind::text AS journal_kind,
       we.created_at AS occurred_at,
       ABS(we.signed_amount_kobo)::text AS amount_kobo,
       (a.kind = 'user' AND a.owner_user_id = $1) AS is_own_wallet
     FROM journal_entries je
     JOIN wallet_entries we ON we.journal_id = je.id
     JOIN accounts a ON a.id = we.account_id
    WHERE je.related_call_id = $2
      AND we.signed_amount_kobo > 0
    ORDER BY we.created_at ASC, we.id ASC`,
    [userId, callId],
  );
  return res.rows;
};
