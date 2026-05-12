import { platformConfig } from '@lib/config/platform-config.service.js';
import { pool } from '@lib/db/pool.js';
import { logger } from '@lib/logger.js';
import { koboToJson } from '@lib/money.js';
import { decodeCursor, encodeCursor, resolveLimit } from '@lib/pagination.js';
import { ServiceError, ServiceSuccess } from '@lib/service-result.js';
import { refundPostSettle, refundReserve } from '@lib/wallet/flows/refund.js';

import { REFUND_MESSAGES } from './refunds.messages.js';
import * as repo from './refunds.repo.js';
import type {
  ApproveRefundDto,
  CreateRefundRequestDto,
  ListRefundRequestsQueryDto,
  RejectRefundDto,
} from './refunds.schema.js';
import {
  RefundRequestStatus,
  type RefundRequestRow,
  type RefundRequestView,
} from './refunds.types.js';

const toView = (row: RefundRequestRow): RefundRequestView => ({
  id: row.id,
  status: row.status,
  target_journal_id: row.target_journal_id,
  related_call_id: row.related_call_id,
  reason_code: row.reason_code,
  description: row.description,
  requested_amount_kobo: koboToJson(BigInt(row.requested_amount_kobo)),
  refund_journal_id: row.refund_journal_id,
  review_note: row.review_note,
  created_at: row.created_at.toISOString(),
  reviewed_at: row.reviewed_at ? row.reviewed_at.toISOString() : null,
});

// ── POST /refunds ───────────────────────────────────────────────────────────
//
// User opens a refund request against a journal that debited their wallet
// (call payment, etc). The journal is verified to actually have a wallet entry
// hitting the requester's user wallet, so users can't open requests against
// random journal ids. The actual refund posts on admin approval.

export const createRefundRequest = async (dto: CreateRefundRequestDto, userId: string) => {
  // Validate target journal exists and the requester has a wallet entry
  // hitting it. The signed amount on that line tells us the spent amount.
  const journal = await repo.findJournalForUserSpend(dto.target_journal_id, userId);
  if (!journal) {
    return new ServiceError('not_found', REFUND_MESSAGES.INVALID_TARGET, 404);
  }

  // Only debits (negative signed_amount on the user's wallet entry) are
  // refundable. Credits to the user (admin_credit, funding) shouldn't be
  // refunded via this flow.
  const userSigned = BigInt(journal.user_signed_amount_kobo);
  if (userSigned >= 0n) {
    return new ServiceError('validation_error', REFUND_MESSAGES.INVALID_TARGET, 422, {
      target_journal_id: ['Refunds can only be opened against debit journals'],
    });
  }
  const requestedAmount = -userSigned;

  // Reject if there's already a pending request for the same journal — the
  // partial unique index would also catch this, but the friendly error is nicer.
  const existing = await pool.query<{ id: string }>(
    `SELECT id FROM refund_requests
      WHERE requester_user_id = $1 AND target_journal_id = $2 AND status = 'pending'
      LIMIT 1`,
    [userId, dto.target_journal_id],
  );
  if (existing.rows[0]) {
    return new ServiceError('conflict', REFUND_MESSAGES.CONFLICT, 409);
  }

  const row = await repo.create({
    requesterUserId: userId,
    targetJournalId: dto.target_journal_id,
    relatedCallId: journal.related_call_id,
    reasonCode: dto.reason_code,
    description: dto.description ?? null,
    requestedAmountKobo: requestedAmount,
  });

  logger.info(
    {
      refundId: row.id,
      userId,
      targetJournalId: dto.target_journal_id,
      requestedAmountKobo: requestedAmount.toString(),
    },
    'refund request created',
  );

  return new ServiceSuccess(toView(row), REFUND_MESSAGES.CREATED);
};

// ── GET /refunds ────────────────────────────────────────────────────────────

export const listRefundRequests = async (dto: ListRefundRequestsQueryDto, userId: string) => {
  const limit = resolveLimit(dto.limit);
  let cursor: { last_id: string; last_sort_key: string } | undefined;
  if (dto.cursor !== undefined) {
    try {
      cursor = decodeCursor(dto.cursor);
    } catch {
      return new ServiceError('validation_error', REFUND_MESSAGES.LIST_FETCHED, 400, {
        cursor: ['Invalid cursor'],
      });
    }
  }

  const rows = await repo.listForUser({
    userId,
    limit,
    ...(cursor ? { cursor } : {}),
    ...(dto.status ? { status: dto.status } : {}),
  });
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor({ last_id: last.id, last_sort_key: last.created_at.toISOString() })
      : null;

  return new ServiceSuccess(
    {
      items: page.map(toView),
      meta: { next_cursor: nextCursor, has_more: hasMore },
    },
    REFUND_MESSAGES.LIST_FETCHED,
  );
};

// ── GET /refunds/:id ────────────────────────────────────────────────────────

export const getRefundRequest = async (refundId: string, userId: string) => {
  const row = await repo.findByIdForUser(refundId, userId);
  if (!row) {
    return new ServiceError('not_found', REFUND_MESSAGES.NOT_FOUND, 404);
  }
  return new ServiceSuccess(toView(row), REFUND_MESSAGES.FETCHED);
};

// ── Admin: approve/reject ──────────────────────────────────────────────────

const isPostSettleJournal = (kind: string): boolean =>
  kind === 'call_settlement' || kind === 'call_refund_post_settle';

export interface ApproveRefundContext {
  refundId: string;
  adminId: string;
  dto: ApproveRefundDto;
}

// Admin approve. Posts the actual refund journal — pre-settle (cheap, just
// release the pending pool) or post-settle (clawback payee + platform_revenue),
// flips status to `approved`, and stamps the resulting journal id on the row.
export const approveRefund = async (ctx: ApproveRefundContext) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const refund = await repo.findByIdForUpdate(client, ctx.refundId);
    if (!refund) {
      await client.query('ROLLBACK');
      return new ServiceError('not_found', REFUND_MESSAGES.NOT_FOUND, 404);
    }
    if (refund.status !== RefundRequestStatus.PENDING) {
      await client.query('ROLLBACK');
      return new ServiceError('conflict', REFUND_MESSAGES.CONFLICT, 409);
    }

    // Look up the target journal so we know whether this is a pre- or
    // post-settle refund and pull the payee/relatedCallId for clawback flows.
    const target = await client.query<{
      kind: string;
      related_call_id: string | null;
    }>(`SELECT kind::text AS kind, related_call_id FROM journal_entries WHERE id = $1 LIMIT 1`, [
      refund.target_journal_id,
    ]);
    const targetRow = target.rows[0];
    if (!targetRow) {
      await client.query('ROLLBACK');
      return new ServiceError('not_found', REFUND_MESSAGES.INVALID_TARGET, 404);
    }

    const amount = BigInt(refund.requested_amount_kobo);
    const callId = targetRow.related_call_id ?? refund.related_call_id;

    let refundJournalId: string;
    if (!isPostSettleJournal(targetRow.kind)) {
      if (!callId) {
        await client.query('ROLLBACK');
        return new ServiceError('validation_error', REFUND_MESSAGES.INVALID_TARGET, 422, {
          target_journal_id: ['Pre-settle refund requires a related call id'],
        });
      }
      const result = await refundReserve(client, {
        callId,
        payerUserId: refund.requester_user_id,
        amountKobo: amount,
        refundRequestId: refund.id,
      });
      refundJournalId = result.journalId;
    } else {
      // Post-settle clawback. Look up the payee from the original settlement
      // journal — it's the user wallet entry with positive signed amount.
      if (!callId) {
        await client.query('ROLLBACK');
        return new ServiceError('validation_error', REFUND_MESSAGES.INVALID_TARGET, 422, {
          target_journal_id: ['Post-settle refund requires a related call id'],
        });
      }
      const payee = await client.query<{ owner_user_id: string }>(
        `SELECT a.owner_user_id
           FROM wallet_entries we
           JOIN accounts a ON a.id = we.account_id
            AND a.kind = 'user'
          WHERE we.journal_id = $1 AND we.signed_amount_kobo > 0
          LIMIT 1`,
        [refund.target_journal_id],
      );
      const payeeUserId = payee.rows[0]?.owner_user_id;
      if (!payeeUserId) {
        await client.query('ROLLBACK');
        return new ServiceError('validation_error', REFUND_MESSAGES.INVALID_TARGET, 422, {
          target_journal_id: ['Could not locate payee for post-settle refund'],
        });
      }
      const cfg = platformConfig.wallet();
      const result = await refundPostSettle(client, {
        callId,
        payerUserId: refund.requester_user_id,
        payeeUserId,
        amountKobo: amount,
        feeBps: cfg.platform_fee_bps,
        refundRequestId: refund.id,
      });
      refundJournalId = result.journalId;
    }

    await repo.markApproved(
      client,
      refund.id,
      ctx.adminId,
      refundJournalId,
      ctx.dto.note ?? null,
      RefundRequestStatus.APPROVED,
    );
    await client.query('COMMIT');

    const updated = await repo.findById(refund.id);
    logger.info(
      {
        refundId: refund.id,
        adminId: ctx.adminId,
        refundJournalId,
        targetKind: targetRow.kind,
      },
      'refund approved',
    );
    return new ServiceSuccess(toView(updated!), REFUND_MESSAGES.APPROVED);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error({ err, refundId: ctx.refundId }, 'approveRefund tx failed');
    throw err;
  } finally {
    client.release();
  }
};

export interface RejectRefundContext {
  refundId: string;
  adminId: string;
  dto: RejectRefundDto;
}

export const rejectRefund = async (ctx: RejectRefundContext) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const refund = await repo.findByIdForUpdate(client, ctx.refundId);
    if (!refund) {
      await client.query('ROLLBACK');
      return new ServiceError('not_found', REFUND_MESSAGES.NOT_FOUND, 404);
    }
    if (refund.status !== RefundRequestStatus.PENDING) {
      await client.query('ROLLBACK');
      return new ServiceError('conflict', REFUND_MESSAGES.CONFLICT, 409);
    }
    await repo.markRejected(client, refund.id, ctx.adminId, ctx.dto.note);
    await client.query('COMMIT');

    const updated = await repo.findById(refund.id);
    logger.info({ refundId: refund.id, adminId: ctx.adminId }, 'refund rejected');
    return new ServiceSuccess(toView(updated!), REFUND_MESSAGES.REJECTED);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error({ err, refundId: ctx.refundId }, 'rejectRefund tx failed');
    throw err;
  } finally {
    client.release();
  }
};

// ── Admin: list all (for ops review) ───────────────────────────────────────

export const adminListRefunds = async (dto: ListRefundRequestsQueryDto) => {
  const limit = resolveLimit(dto.limit);
  let cursor: { last_id: string; last_sort_key: string } | undefined;
  if (dto.cursor !== undefined) {
    try {
      cursor = decodeCursor(dto.cursor);
    } catch {
      return new ServiceError('validation_error', REFUND_MESSAGES.LIST_FETCHED, 400, {
        cursor: ['Invalid cursor'],
      });
    }
  }

  const params: unknown[] = [];
  const filters: string[] = [];
  if (dto.status) {
    params.push(dto.status);
    filters.push(`status = $${params.length}::refund_request_status`);
  }
  if (cursor) {
    params.push(cursor.last_sort_key);
    params.push(cursor.last_id);
    filters.push(
      `(created_at < $${params.length - 1}::timestamptz OR (created_at = $${params.length - 1}::timestamptz AND id < $${params.length}))`,
    );
  }
  params.push(limit + 1);
  const where = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
  const res = await pool.query<RefundRequestRow>(
    `SELECT * FROM refund_requests
       ${where}
       ORDER BY created_at DESC, id DESC
       LIMIT $${params.length}`,
    params,
  );
  const rows = res.rows;
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor({ last_id: last.id, last_sort_key: last.created_at.toISOString() })
      : null;

  return new ServiceSuccess(
    {
      items: page.map(toView),
      meta: { next_cursor: nextCursor, has_more: hasMore },
    },
    REFUND_MESSAGES.LIST_FETCHED,
  );
};
