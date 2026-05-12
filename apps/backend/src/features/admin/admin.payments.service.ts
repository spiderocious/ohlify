import * as walletRepo from '@features/wallet/wallet.repo.js';
import { pool } from '@lib/db/pool.js';
import { logger } from '@lib/logger.js';
import { koboToJson } from '@lib/money.js';
import { decodeCursor, encodeCursor, resolveLimit } from '@lib/pagination.js';
import { initiateTransfer, PaystackUpstreamError } from '@lib/paystack/client.js';
import { ServiceError, ServiceSuccess } from '@lib/service-result.js';
import { postWithdrawalReversedJournal } from '@lib/wallet/flows/withdrawal.js';
import { MESSAGE_KEYS } from '@shared/constants/message-keys.js';

import * as repo from './admin.payments.repo.js';
import type {
  AdminApproveWithdrawalDto,
  AdminListTransactionsQueryDto,
  AdminRejectWithdrawalDto,
} from './admin.write.schema.js';

// ── GET /admin/transactions ──────────────────────────────────────────────

export const listTransactions = async (dto: AdminListTransactionsQueryDto) => {
  const limit = resolveLimit(dto.limit);
  let cursor: { last_id: string; last_sort_key: string } | undefined;
  if (dto.cursor !== undefined) {
    try {
      cursor = decodeCursor(dto.cursor);
    } catch {
      return new ServiceError(
        'validation_error',
        MESSAGE_KEYS.ADMIN_TRANSACTIONS_LIST_FETCHED,
        400,
        { cursor: ['Invalid cursor'] },
      );
    }
  }
  const rows = await repo.listTransactions({
    limit,
    ...(cursor ? { cursor } : {}),
    ...(dto.source ? { source: dto.source } : {}),
    ...(dto.status ? { status: dto.status } : {}),
    ...(dto.user_id ? { user_id: dto.user_id } : {}),
    ...(dto.reference ? { reference: dto.reference } : {}),
    ...(dto.from ? { from: new Date(dto.from) } : {}),
    ...(dto.to ? { to: new Date(dto.to) } : {}),
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
      items: page.map((r) => ({
        id: r.id,
        source: r.source,
        type: r.type,
        status: r.status,
        user_id: r.user_id,
        call_id: r.call_id,
        reference: r.reference,
        paystack_reference: r.paystack_reference,
        amount_kobo: koboToJson(BigInt(r.amount_kobo || '0')),
        signed_amount_kobo:
          r.signed_amount_kobo !== null ? koboToJson(BigInt(r.signed_amount_kobo)) : null,
        currency: r.currency,
        created_at: r.created_at.toISOString(),
      })),
      meta: { next_cursor: nextCursor, has_more: hasMore },
    },
    MESSAGE_KEYS.ADMIN_TRANSACTIONS_LIST_FETCHED,
  );
};

// ── GET /admin/transactions/:id ──────────────────────────────────────────

export const getTransactionDetail = async (id: string) => {
  const row = await repo.findTxnDetail(id);
  if (!row) {
    return new ServiceError('not_found', MESSAGE_KEYS.ADMIN_TRANSACTION_FETCHED, 404);
  }
  if (row.source === 'payment') {
    return new ServiceSuccess(
      {
        source: row.source,
        payment: {
          ...row.payment,
          amount_kobo: koboToJson(BigInt(row.payment.amount_kobo)),
          paystack_fees_kobo:
            row.payment.paystack_fees_kobo !== null
              ? koboToJson(BigInt(row.payment.paystack_fees_kobo))
              : null,
          paid_at: row.payment.paid_at?.toISOString() ?? null,
          created_at: row.payment.created_at.toISOString(),
          updated_at: row.payment.updated_at.toISOString(),
        },
        related_webhooks: row.related_webhooks.map((w) => ({
          id: w.id,
          event_id: w.event_id,
          event_type: w.event_type,
          received_at: w.received_at.toISOString(),
          processed_at: w.processed_at?.toISOString() ?? null,
          processing_error: w.processing_error,
        })),
      },
      MESSAGE_KEYS.ADMIN_TRANSACTION_FETCHED,
    );
  }
  return new ServiceSuccess(
    {
      source: row.source,
      journal: {
        ...row.journal,
        created_at: row.journal.created_at.toISOString(),
      },
      lines: row.lines.map((l) => ({
        id: l.id,
        account_id: l.account_id,
        account_kind: l.account_kind,
        account_label: l.account_label,
        signed_amount_kobo: koboToJson(BigInt(l.signed_amount_kobo)),
        currency: l.currency,
      })),
    },
    MESSAGE_KEYS.ADMIN_TRANSACTION_FETCHED,
  );
};

// ── POST /admin/withdrawals/:id/approve ──────────────────────────────────
//
// Manual-review path: when wallet.payout_mode is `manual_review`, new
// withdrawals land in `pending` with no transfer_code and wait. This
// endpoint kicks off the actual Paystack transfer.
//
// We mirror the synchronous transfer + status flip pattern from the user-
// flow (see wallet.service.fireTransferAndUpdate). On Paystack rejection
// we reverse the journal so the user's wallet is restored.
export const approveWithdrawal = async (withdrawalId: string, _dto: AdminApproveWithdrawalDto) => {
  const wd = await walletRepo.findWithdrawalById(withdrawalId);
  if (!wd) {
    return new ServiceError('not_found', MESSAGE_KEYS.ADMIN_WITHDRAWAL_APPROVED, 404);
  }
  if (wd.status !== 'pending') {
    return new ServiceError('conflict', MESSAGE_KEYS.ADMIN_WITHDRAWAL_APPROVED, 409, {
      status: [`Withdrawal is currently ${wd.status} (must be pending to approve)`],
    });
  }
  if (!wd.paystack_recipient_code) {
    return new ServiceError('conflict', MESSAGE_KEYS.ADMIN_WITHDRAWAL_APPROVED, 409, {
      paystack_recipient_code: ['Recipient not provisioned — user must re-add bank'],
    });
  }

  try {
    const transfer = await initiateTransfer({
      recipientCode: wd.paystack_recipient_code,
      amountKobo: Number(BigInt(wd.amount_kobo)),
      reference: wd.id,
      reason: 'Ohlify withdrawal (admin approved)',
    });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await walletRepo.setWithdrawalProcessing(
        client,
        wd.id,
        transfer.transfer_code,
        transfer.paystack_id !== null ? String(transfer.paystack_id) : null,
      );
      await client.query('COMMIT');
    } finally {
      client.release();
    }
    logger.warn(
      { withdrawalId: wd.id, transferCode: transfer.transfer_code },
      'admin approved withdrawal — transfer initiated',
    );
    return new ServiceSuccess(
      { withdrawal_id: wd.id, status: 'processing', transfer_code: transfer.transfer_code },
      MESSAGE_KEYS.ADMIN_WITHDRAWAL_APPROVED,
    );
  } catch (err) {
    if (err instanceof PaystackUpstreamError) {
      // Bubble as a 502 — admin should see this and decide to reject
      // instead. Don't auto-reverse here; ops may want to retry once
      // Paystack recovers.
      logger.warn(
        { withdrawalId: wd.id, err: err.message },
        'admin approve: paystack upstream error',
      );
      return new ServiceError('upstream_unavailable', MESSAGE_KEYS.ADMIN_WITHDRAWAL_APPROVED, 502);
    }
    throw err;
  }
};

// ── POST /admin/withdrawals/:id/reject ────────────────────────────────────
//
// Reject a `pending` (manual-review) withdrawal. Posts the reversal
// journal so the user's wallet is restored, marks the row failed.
export const rejectWithdrawal = async (withdrawalId: string, dto: AdminRejectWithdrawalDto) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const wd = await walletRepo.findWithdrawalByIdForUpdate(client, withdrawalId);
    if (!wd) {
      await client.query('ROLLBACK');
      return new ServiceError('not_found', MESSAGE_KEYS.ADMIN_WITHDRAWAL_REJECTED, 404);
    }
    if (wd.status !== 'pending') {
      await client.query('ROLLBACK');
      return new ServiceError('conflict', MESSAGE_KEYS.ADMIN_WITHDRAWAL_REJECTED, 409, {
        status: [`Withdrawal is currently ${wd.status} (must be pending to reject)`],
      });
    }
    await postWithdrawalReversedJournal(client, {
      withdrawalId: wd.id,
      userId: wd.user_id,
      amountKobo: BigInt(wd.amount_kobo),
    });
    await walletRepo.setWithdrawalFailed(client, wd.id, dto.reason);
    await client.query('COMMIT');
    logger.warn(
      { withdrawalId: wd.id, reason: dto.reason },
      'admin rejected withdrawal — reversal posted, marked failed',
    );
    return new ServiceSuccess(
      { withdrawal_id: wd.id, status: 'failed' },
      MESSAGE_KEYS.ADMIN_WITHDRAWAL_REJECTED,
    );
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error({ err, withdrawalId }, 'admin rejectWithdrawal tx failed');
    throw err;
  } finally {
    client.release();
  }
};

// ── POST /admin/payouts/sync ──────────────────────────────────────────────
//
// Lightweight safety-net: surfaces stale withdrawals that need attention.
// We don't have a fetch-transfer-status Paystack helper yet, so this
// endpoint reports the rows that ops needs to look at rather than
// silently re-driving them. Matches the pattern from C-NEW-08/09 — fail
// loud instead of doing magic.
//
// Returns:
//   - withdrawals stuck in `processing` for > 30 minutes (transfer fired,
//     but no terminal webhook received yet)
//   - withdrawals stuck in `pending` for > 24 hours (manual-review queue
//     building up)
//
// Once we add a Paystack transfer-status endpoint, this can drive the
// actual sync.
export const syncPayouts = async () => {
  const stuck = await pool.query<{
    id: string;
    user_id: string;
    status: string;
    amount_kobo: string;
    requested_at: Date;
    paystack_transfer_code: string | null;
  }>(
    `SELECT id, user_id, status::text AS status, amount_kobo::text,
            requested_at, paystack_transfer_code
       FROM withdrawals
       WHERE
         (status = 'processing' AND requested_at < now() - INTERVAL '30 minutes')
         OR
         (status = 'pending' AND requested_at < now() - INTERVAL '24 hours')
       ORDER BY requested_at ASC
       LIMIT 200`,
  );

  return new ServiceSuccess(
    {
      stuck: stuck.rows.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        status: r.status,
        amount_kobo: koboToJson(BigInt(r.amount_kobo)),
        requested_at: r.requested_at.toISOString(),
        paystack_transfer_code: r.paystack_transfer_code,
      })),
      generated_at: new Date().toISOString(),
    },
    MESSAGE_KEYS.ADMIN_PAYOUTS_SYNC_RAN,
  );
};
