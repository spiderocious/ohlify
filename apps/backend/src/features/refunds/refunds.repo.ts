import type { PoolClient } from 'pg';

import { pool } from '@lib/db/pool.js';
import { id } from '@lib/ids.js';

import type { RefundRequestRow, RefundRequestStatus } from './refunds.types.js';

interface QueryRunner {
  query: PoolClient['query'];
}

export interface CreateRefundRequestInput {
  requesterUserId: string;
  targetJournalId: string;
  relatedCallId: string | null;
  reasonCode: string;
  description: string | null;
  requestedAmountKobo: bigint;
}

export const create = async (input: CreateRefundRequestInput): Promise<RefundRequestRow> => {
  const res = await pool.query<RefundRequestRow>(
    `INSERT INTO refund_requests (
       id, requester_user_id, target_journal_id, related_call_id,
       reason_code, description, requested_amount_kobo, status
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
     RETURNING *`,
    [
      id('rfd'),
      input.requesterUserId,
      input.targetJournalId,
      input.relatedCallId,
      input.reasonCode,
      input.description,
      input.requestedAmountKobo.toString(),
    ],
  );
  return res.rows[0]!;
};

export const findById = async (refundId: string): Promise<RefundRequestRow | null> => {
  const res = await pool.query<RefundRequestRow>(
    `SELECT * FROM refund_requests WHERE id = $1 LIMIT 1`,
    [refundId],
  );
  return res.rows[0] ?? null;
};

export const findByIdForUpdate = async (
  runner: QueryRunner,
  refundId: string,
): Promise<RefundRequestRow | null> => {
  const res = await runner.query<RefundRequestRow>(
    `SELECT * FROM refund_requests WHERE id = $1 LIMIT 1 FOR UPDATE`,
    [refundId],
  );
  return res.rows[0] ?? null;
};

export const findByIdForUser = async (
  refundId: string,
  userId: string,
): Promise<RefundRequestRow | null> => {
  const res = await pool.query<RefundRequestRow>(
    `SELECT * FROM refund_requests WHERE id = $1 AND requester_user_id = $2 LIMIT 1`,
    [refundId, userId],
  );
  return res.rows[0] ?? null;
};

interface ListInput {
  userId: string;
  limit: number;
  cursor?: { last_id: string; last_sort_key: string };
  status?: RefundRequestStatus;
}

export const listForUser = async (input: ListInput): Promise<RefundRequestRow[]> => {
  const params: unknown[] = [input.userId];
  const filters: string[] = ['requester_user_id = $1'];
  if (input.status !== undefined) {
    params.push(input.status);
    filters.push(`status = $${params.length}::refund_request_status`);
  }
  if (input.cursor !== undefined) {
    params.push(input.cursor.last_sort_key);
    params.push(input.cursor.last_id);
    filters.push(
      `(created_at < $${params.length - 1}::timestamptz OR (created_at = $${params.length - 1}::timestamptz AND id < $${params.length}))`,
    );
  }
  params.push(input.limit + 1);
  const res = await pool.query<RefundRequestRow>(
    `SELECT * FROM refund_requests
      WHERE ${filters.join(' AND ')}
      ORDER BY created_at DESC, id DESC
      LIMIT $${params.length}`,
    params,
  );
  return res.rows;
};

export const markApproved = async (
  runner: QueryRunner,
  refundId: string,
  adminId: string | null,
  refundJournalId: string,
  note: string | null,
  status: 'approved' | 'auto_approved',
): Promise<void> => {
  await runner.query(
    `UPDATE refund_requests
        SET status = $2::refund_request_status,
            refund_journal_id = $3,
            reviewed_by_admin_id = $4,
            reviewed_at = now(),
            review_note = $5,
            updated_at = now()
      WHERE id = $1`,
    [refundId, status, refundJournalId, adminId, note],
  );
};

export const markRejected = async (
  runner: QueryRunner,
  refundId: string,
  adminId: string,
  note: string,
): Promise<void> => {
  await runner.query(
    `UPDATE refund_requests
        SET status = 'rejected',
            reviewed_by_admin_id = $2,
            reviewed_at = now(),
            review_note = $3,
            updated_at = now()
      WHERE id = $1`,
    [refundId, adminId, note],
  );
};

// Helper: find the journal a user can legitimately request a refund against.
//
// Two valid shapes:
//
//   1. Pre-settle target — the user has a debit wallet entry on the journal
//      itself (e.g. `call_payment_reserve` debiting their wallet).
//
//   2. Post-settle target — the journal is a `call_settlement` for a call
//      where this user posted the reserve. The user has no wallet line on
//      the settlement (their money is in pending_debits_pool, the payee's
//      line is the only user line, and it's a credit), so we cross-reference
//      via the matching `call_payment_reserve` on the same related_call_id.
//
// `user_signed_amount_kobo` is the original spend (always negative). For
// post-settle targets we read it from the reserve journal, not the
// settlement; the service caller branches on `kind` to drive the right flow.
export interface JournalSummary {
  id: string;
  kind: string;
  user_signed_amount_kobo: string;
  related_call_id: string | null;
}

export const findJournalForUserSpend = async (
  journalId: string,
  userId: string,
): Promise<JournalSummary | null> => {
  // Direct match: user has a wallet entry on the target journal.
  const direct = await pool.query<JournalSummary>(
    `SELECT je.id,
            je.kind::text AS kind,
            we.signed_amount_kobo::text AS user_signed_amount_kobo,
            je.related_call_id
       FROM journal_entries je
       JOIN wallet_entries we ON we.journal_id = je.id
       JOIN accounts a ON a.id = we.account_id
        AND a.kind = 'user'
        AND a.owner_user_id = $2
      WHERE je.id = $1
      LIMIT 1`,
    [journalId, userId],
  );
  if (direct.rows[0]) return direct.rows[0];

  // Cross-reference: target is a call_settlement; user is the payer on the
  // matching call_payment_reserve for the same call.
  const indirect = await pool.query<JournalSummary>(
    `WITH target AS (
       SELECT id, kind::text AS kind, related_call_id
         FROM journal_entries
        WHERE id = $1
          AND kind = 'call_settlement'
          AND related_call_id IS NOT NULL
        LIMIT 1
     )
     SELECT t.id,
            t.kind,
            we.signed_amount_kobo::text AS user_signed_amount_kobo,
            t.related_call_id
       FROM target t
       JOIN journal_entries reserve
         ON reserve.related_call_id = t.related_call_id
        AND reserve.kind = 'call_payment_reserve'
       JOIN wallet_entries we ON we.journal_id = reserve.id
       JOIN accounts a ON a.id = we.account_id
        AND a.kind = 'user'
        AND a.owner_user_id = $2
      WHERE we.signed_amount_kobo < 0
      LIMIT 1`,
    [journalId, userId],
  );
  return indirect.rows[0] ?? null;
};
