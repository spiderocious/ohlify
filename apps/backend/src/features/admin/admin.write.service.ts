import * as authRepo from '@features/auth/auth.repo.js';
import { replayWebhookEnvelope } from '@features/payments/payments.service.js';
import * as webhookRepo from '@features/payments/webhook-repo.js';
import * as refundsService from '@features/refunds/refunds.service.js';
import * as walletRepo from '@features/wallet/wallet.repo.js';
import { pool } from '@lib/db/pool.js';
import { logger } from '@lib/logger.js';
import { koboToJson } from '@lib/money.js';
import { decodeCursor, encodeCursor, resolveLimit } from '@lib/pagination.js';
import { ServiceError, ServiceSuccess } from '@lib/service-result.js';
import { adminCreditUser, adminDebitUser, postManualJournal } from '@lib/wallet/flows/admin.js';
import { postWithdrawalReversedJournal } from '@lib/wallet/flows/withdrawal.js';
import { MESSAGE_KEYS } from '@shared/constants/message-keys.js';

import type {
  AdminApproveRefundDto,
  AdminCreditDto,
  AdminDebitDto,
  AdminForceFailWithdrawalDto,
  AdminListRefundsQueryDto,
  AdminListWithdrawalsQueryDto,
  AdminRejectRefundDto,
  AdminReplayWebhookDto,
  ManualJournalDto,
} from './admin.write.schema.js';

// Slice B uses a stub admin id for all admin actions — replaced in §21.
const STUB_ADMIN_ID = 'adm_stub';

// ── POST /admin/wallets/manual-journal ──────────────────────────────────────

export const postManualJournalAction = async (dto: ManualJournalDto) => {
  try {
    const result = await postManualJournal({
      adminId: STUB_ADMIN_ID,
      note: dto.note,
      lines: dto.lines.map((l) => ({
        accountId: l.account_id,
        signedAmountKobo: l.signed_amount_kobo,
        ...(l.currency !== undefined ? { currency: l.currency } : {}),
      })),
      ...(dto.related_user_id !== undefined ? { relatedUserId: dto.related_user_id } : {}),
      ...(dto.related_call_id !== undefined ? { relatedCallId: dto.related_call_id } : {}),
      ...(dto.idempotency_key !== undefined ? { idempotencyKey: dto.idempotency_key } : {}),
    });
    return new ServiceSuccess(
      {
        journal_id: result.journalId,
        already_posted: result.alreadyPosted,
      },
      MESSAGE_KEYS.ADMIN_MANUAL_JOURNAL_POSTED,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'manual journal failed';
    return new ServiceError('validation_error', MESSAGE_KEYS.ADMIN_MANUAL_JOURNAL_POSTED, 422, {
      lines: [message],
    });
  }
};

// ── POST /admin/wallets/credit ──────────────────────────────────────────────

interface AdminMoveResult {
  journal_id: string;
  already_posted: boolean;
  user_id: string;
  amount_kobo: ReturnType<typeof koboToJson>;
}

export const adminCreditAction = async (
  dto: AdminCreditDto,
): Promise<ServiceSuccess<AdminMoveResult> | ServiceError> => {
  const user = await authRepo.findUserById(dto.user_id);
  if (!user) {
    return new ServiceError('not_found', MESSAGE_KEYS.ADMIN_USER_CREDITED, 404, {
      user_id: ['User not found'],
    });
  }
  const result = await adminCreditUser({
    adminId: STUB_ADMIN_ID,
    userId: dto.user_id,
    amountKobo: BigInt(dto.amount_kobo),
    reason: dto.reason,
    ...(dto.idempotency_key !== undefined ? { idempotencyKey: dto.idempotency_key } : {}),
  });
  return new ServiceSuccess<AdminMoveResult>(
    {
      journal_id: result.journalId,
      already_posted: result.alreadyPosted,
      user_id: dto.user_id,
      amount_kobo: koboToJson(BigInt(dto.amount_kobo)),
    },
    MESSAGE_KEYS.ADMIN_USER_CREDITED,
  );
};

// ── POST /admin/wallets/debit ───────────────────────────────────────────────

export const adminDebitAction = async (
  dto: AdminDebitDto,
): Promise<ServiceSuccess<AdminMoveResult> | ServiceError> => {
  const user = await authRepo.findUserById(dto.user_id);
  if (!user) {
    return new ServiceError('not_found', MESSAGE_KEYS.ADMIN_USER_DEBITED, 404, {
      user_id: ['User not found'],
    });
  }
  const result = await adminDebitUser({
    adminId: STUB_ADMIN_ID,
    userId: dto.user_id,
    amountKobo: BigInt(dto.amount_kobo),
    reason: dto.reason,
    ...(dto.idempotency_key !== undefined ? { idempotencyKey: dto.idempotency_key } : {}),
  });
  return new ServiceSuccess<AdminMoveResult>(
    {
      journal_id: result.journalId,
      already_posted: result.alreadyPosted,
      user_id: dto.user_id,
      amount_kobo: koboToJson(BigInt(dto.amount_kobo)),
    },
    MESSAGE_KEYS.ADMIN_USER_DEBITED,
  );
};

// ── Refunds: list / approve / reject (delegates to refunds service) ─────────

export const listRefunds = async (dto: AdminListRefundsQueryDto) => {
  const result = await refundsService.adminListRefunds(dto);
  if (!result.success) return result;
  return new ServiceSuccess(result.data, MESSAGE_KEYS.ADMIN_REFUNDS_LIST_FETCHED);
};

export const approveRefund = async (refundId: string, dto: AdminApproveRefundDto) => {
  const result = await refundsService.approveRefund({
    refundId,
    adminId: STUB_ADMIN_ID,
    dto,
  });
  if (!result.success) return result;
  return new ServiceSuccess(result.data, MESSAGE_KEYS.ADMIN_REFUND_APPROVED);
};

export const rejectRefund = async (refundId: string, dto: AdminRejectRefundDto) => {
  const result = await refundsService.rejectRefund({
    refundId,
    adminId: STUB_ADMIN_ID,
    dto,
  });
  if (!result.success) return result;
  return new ServiceSuccess(result.data, MESSAGE_KEYS.ADMIN_REFUND_REJECTED);
};

// ── Withdrawals: list / force-fail ──────────────────────────────────────────

export const listWithdrawalsAdmin = async (dto: AdminListWithdrawalsQueryDto) => {
  const limit = resolveLimit(dto.limit);
  let cursor: { last_id: string; last_sort_key: string } | undefined;
  if (dto.cursor !== undefined) {
    try {
      cursor = decodeCursor(dto.cursor);
    } catch {
      return new ServiceError(
        'validation_error',
        MESSAGE_KEYS.ADMIN_WITHDRAWALS_LIST_FETCHED,
        400,
        { cursor: ['Invalid cursor'] },
      );
    }
  }

  const params: unknown[] = [];
  const filters: string[] = [];
  if (dto.status) {
    params.push(dto.status);
    filters.push(`status = $${params.length}::withdrawal_status`);
  }
  if (dto.user_id) {
    params.push(dto.user_id);
    filters.push(`user_id = $${params.length}`);
  }
  if (cursor) {
    params.push(cursor.last_sort_key);
    params.push(cursor.last_id);
    filters.push(
      `(requested_at < $${params.length - 1}::timestamptz OR (requested_at = $${params.length - 1}::timestamptz AND id < $${params.length}))`,
    );
  }
  params.push(limit + 1);
  const where = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

  const res = await pool.query<walletRepo.WithdrawalRow>(
    `SELECT * FROM withdrawals
       ${where}
       ORDER BY requested_at DESC, id DESC
       LIMIT $${params.length}`,
    params,
  );
  const rows = res.rows;
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor({ last_id: last.id, last_sort_key: last.requested_at.toISOString() })
      : null;

  return new ServiceSuccess(
    {
      items: page.map((row) => ({
        id: row.id,
        user_id: row.user_id,
        status: row.status,
        amount_kobo: koboToJson(BigInt(row.amount_kobo)),
        currency: row.currency,
        bank_snapshot: row.bank_snapshot,
        failure_reason: row.failure_reason,
        paystack_transfer_code: row.paystack_transfer_code,
        requested_at: row.requested_at.toISOString(),
        processed_at: row.processed_at ? row.processed_at.toISOString() : null,
      })),
      meta: { next_cursor: nextCursor, has_more: hasMore },
    },
    MESSAGE_KEYS.ADMIN_WITHDRAWALS_LIST_FETCHED,
  );
};

// Force-fail a stuck withdrawal — flips to `failed` and posts the reversed
// journal so the user's balance is restored. Used when Paystack is silent
// (no webhook delivery) and ops needs to unstick the funds.
export const forceFailWithdrawal = async (
  withdrawalId: string,
  dto: AdminForceFailWithdrawalDto,
) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const wd = await walletRepo.findWithdrawalByIdForUpdate(client, withdrawalId);
    if (!wd) {
      await client.query('ROLLBACK');
      return new ServiceError('not_found', MESSAGE_KEYS.ADMIN_WITHDRAWAL_FORCED_FAIL, 404);
    }
    if (wd.status === 'completed' || wd.status === 'failed' || wd.status === 'reversed') {
      await client.query('ROLLBACK');
      return new ServiceError('conflict', MESSAGE_KEYS.ADMIN_WITHDRAWAL_FORCED_FAIL, 409);
    }
    await postWithdrawalReversedJournal(client, {
      withdrawalId: wd.id,
      userId: wd.user_id,
      amountKobo: BigInt(wd.amount_kobo),
    });
    await walletRepo.setWithdrawalReversed(client, wd.id, dto.reason);
    await client.query('COMMIT');
    logger.warn(
      { withdrawalId: wd.id, adminId: STUB_ADMIN_ID, reason: dto.reason },
      'admin force-failed withdrawal',
    );
    return new ServiceSuccess(
      { withdrawal_id: wd.id, status: 'reversed' },
      MESSAGE_KEYS.ADMIN_WITHDRAWAL_FORCED_FAIL,
    );
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error({ err, withdrawalId }, 'forceFailWithdrawal tx failed');
    throw err;
  } finally {
    client.release();
  }
};

// ── POST /admin/wallets/replay-webhook ──────────────────────────────────────

// Replay a stored webhook envelope — re-runs business processing against the
// raw_body that was originally received. The journal idempotency keys keep
// the ledger safe against double-posting; the webhook envelope's
// processing_error / replay_count is updated by webhookRepo.markReplayed.
export const replayWebhook = async (dto: AdminReplayWebhookDto) => {
  const envelope = await webhookRepo.findById(dto.webhook_id);
  if (!envelope) {
    return new ServiceError('not_found', MESSAGE_KEYS.ADMIN_WEBHOOK_REPLAYED, 404);
  }
  await webhookRepo.markReplayed(dto.webhook_id);
  const result = await replayWebhookEnvelope({ rawBody: envelope.raw_body });
  return new ServiceSuccess(
    { webhook_id: dto.webhook_id, accepted: result.accepted, reason: result.reason ?? null },
    MESSAGE_KEYS.ADMIN_WEBHOOK_REPLAYED,
  );
};
