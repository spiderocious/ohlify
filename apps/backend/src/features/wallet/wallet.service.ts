import * as authRepo from '@features/auth/auth.repo.js';
import * as paymentsRepo from '@features/payments/payments.repo.js';
import { PaymentPurpose, PaymentStatus } from '@features/payments/payments.types.js';
import { platformConfig } from '@lib/config/platform-config.service.js';
import { pool } from '@lib/db/pool.js';
import { newRawId } from '@lib/ids.js';
import { logger } from '@lib/logger.js';
import { decodeCursor, encodeCursor, resolveLimit } from '@lib/pagination.js';
import {
  initializeTransaction,
  PaystackUpstreamError,
  verifyTransaction,
} from '@lib/paystack/client.js';
import { ServiceError, ServiceSuccess } from '@lib/service-result.js';
import { applyFunding } from '@lib/wallet/flows/funding.js';
import { accountFor, readUserAvailableBalance, readUserPendingBalance } from '@lib/wallet/index.js';

import { WALLET_MESSAGES } from './wallet.messages.js';
import * as repo from './wallet.repo.js';
import type {
  InitializeFundingDto,
  TransactionsQueryDto,
  VerifyFundingDto,
} from './wallet.schema.js';
import type {
  FundingInitView,
  FundingVerifyView,
  WalletStatsView,
  WalletSummaryView,
  WalletTransactionView,
} from './wallet.types.js';

// Stable client-facing transaction `type` derived from the journal kind.
// Mobile uses these strings directly. Withdrawals come in slice B.
const journalKindToTxType = (kind: string): string => {
  switch (kind) {
    case 'wallet_funding':
      return 'wallet_funding';
    case 'wallet_funding_reversed':
      return 'wallet_funding_reversed';
    case 'call_payment_reserve':
      return 'call_payment';
    case 'call_settlement':
      return 'call_earning';
    case 'call_refund':
    case 'call_refund_post_settle':
      return 'call_refund';
    case 'withdrawal_requested':
      return 'withdrawal';
    case 'withdrawal_completed':
      return 'withdrawal_completed';
    case 'withdrawal_reversed':
      return 'withdrawal_reversed';
    case 'admin_credit':
      return 'admin_credit';
    case 'admin_debit':
      return 'admin_debit';
    case 'admin_manual':
      return 'admin_manual';
    case 'platform_promo_grant':
      return 'promo_credit';
    default:
      return kind;
  }
};

// Free-form description of the row for receipts / customer support.
const describeTransaction = (kind: string, signedAmount: number): string => {
  const credit = signedAmount > 0;
  switch (kind) {
    case 'wallet_funding':
      return 'Wallet funding';
    case 'wallet_funding_reversed':
      return 'Wallet funding reversed';
    case 'call_payment_reserve':
      return 'Call booking payment';
    case 'call_settlement':
      return credit ? 'Call earning' : 'Call settlement';
    case 'call_refund':
    case 'call_refund_post_settle':
      return 'Call refund';
    case 'withdrawal_requested':
      return 'Withdrawal to bank';
    case 'withdrawal_completed':
      return 'Withdrawal completed';
    case 'withdrawal_reversed':
      return 'Withdrawal reversed';
    case 'admin_credit':
      return 'Manual credit';
    case 'admin_debit':
      return 'Manual debit';
    case 'admin_manual':
      return 'Manual adjustment';
    case 'platform_promo_grant':
      return 'Promotional credit';
    default:
      return kind;
  }
};

// ── GET /wallet ──────────────────────────────────────────────────────────────

export const getSummary = async (userId: string) => {
  const [available, pending] = await Promise.all([
    readUserAvailableBalance(userId),
    readUserPendingBalance(userId),
  ]);

  // Withdrawable = balance minus money already parked in pending pool for
  // this user. The pending balance is a positive number; available already
  // excludes it (because the reserve journal subtracted it from the wallet).
  // So withdrawable IS the available balance. Surfaced separately for clarity.
  const view: WalletSummaryView = {
    balance_kobo: available,
    pending_balance_kobo: pending,
    withdrawable_balance_kobo: available,
    currency: 'NGN',
  };
  return new ServiceSuccess(view, WALLET_MESSAGES.FETCHED);
};

// ── GET /wallet/stats ────────────────────────────────────────────────────────

export const getStats = async (userId: string) => {
  const row = await repo.readUserWalletStats(userId);
  // ⚠️ SMOKING-GUN STUB: total_calls is hardcoded to 0 because the calls
  // table doesn't exist yet (§8). When §8 ships, replace with:
  //   SELECT count(*) FROM calls WHERE caller_user_id = $1 AND status='completed'
  // and remove this comment. Currently visible as constant 0 in every API
  // response so the gap is impossible to miss during QA.
  const view: WalletStatsView = {
    this_week_kobo: Number(row.this_week_kobo),
    this_month_kobo: Number(row.this_month_kobo),
    total_calls: 0,
  };
  return new ServiceSuccess(view, WALLET_MESSAGES.STATS_FETCHED);
};

// ── GET /wallet/transactions ─────────────────────────────────────────────────

export const listTransactions = async (dto: TransactionsQueryDto, userId: string) => {
  const limit = resolveLimit(dto.limit);
  let cursor: { last_id: string; last_sort_key: string } | undefined;
  if (dto.cursor !== undefined) {
    try {
      cursor = decodeCursor(dto.cursor);
    } catch {
      return new ServiceError('validation_error', WALLET_MESSAGES.TRANSACTIONS_FETCHED, 400, {
        cursor: ['Invalid cursor'],
      });
    }
  }

  const rows = await repo.listUserTransactions({ userId, limit, ...(cursor ? { cursor } : {}) });
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const items: WalletTransactionView[] = page.map((row) => {
    const signed = Number(row.signed_amount_kobo);
    return {
      id: row.entry_id,
      journal_id: row.journal_id,
      reference: row.reference,
      type: journalKindToTxType(row.journal_kind),
      amount_kobo: signed,
      currency: row.currency,
      // status mapping: in slice A every wallet_entry that exists is
      // `completed` — withdrawals (slice B) introduce `pending`/`failed`
      // states by writing distinct journal kinds.
      status: 'completed',
      occurred_at: row.occurred_at.toISOString(),
      description: describeTransaction(row.journal_kind, signed),
      related_call_id: row.related_call_id,
      related_payment_id: row.related_payment_id,
      related_withdrawal_id: row.related_withdrawal_id,
    };
  });

  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor({ last_id: last.entry_id, last_sort_key: last.occurred_at.toISOString() })
      : null;

  return new ServiceSuccess(
    {
      items,
      meta: { next_cursor: nextCursor, has_more: hasMore },
    },
    WALLET_MESSAGES.TRANSACTIONS_FETCHED,
  );
};

// ── POST /wallet/fund/initialize ────────────────────────────────────────────

export const initializeFunding = async (dto: InitializeFundingDto, userId: string) => {
  const cfg = platformConfig.wallet();
  if (dto.amount_kobo < cfg.min_funding_kobo) {
    return new ServiceError('value_out_of_range', WALLET_MESSAGES.FUNDING_FAILED, 422, {
      amount_kobo: [`amount_kobo must be at least ${cfg.min_funding_kobo}`],
    });
  }
  if (dto.amount_kobo > cfg.max_funding_kobo) {
    return new ServiceError('value_out_of_range', WALLET_MESSAGES.FUNDING_FAILED, 422, {
      amount_kobo: [`amount_kobo must be at most ${cfg.max_funding_kobo}`],
    });
  }

  const user = await authRepo.findUserById(userId);
  if (!user) {
    return new ServiceError('token_invalid', WALLET_MESSAGES.FUNDING_FAILED, 401);
  }

  // Ensure the user has a wallet account materialized — first-time funders.
  await accountFor.user(userId);

  // Internal reference is what the user sees (receipts, support). Paystack's
  // own reference is stored in paystack_reference once the webhook arrives.
  const reference = `ohf_ref_${newRawId()}`;

  let paystackResult;
  try {
    paystackResult = await initializeTransaction({
      email: user.email,
      amountKobo: dto.amount_kobo,
      reference,
      ...(dto.callback_url !== undefined ? { callbackUrl: dto.callback_url } : {}),
      metadata: {
        user_id: userId,
        purpose: PaymentPurpose.WALLET_FUNDING,
      },
    });
  } catch (err) {
    if (err instanceof PaystackUpstreamError) {
      return new ServiceError(
        'upstream_unavailable',
        WALLET_MESSAGES.FUNDING_FAILED,
        502,
        undefined,
        5,
      );
    }
    throw err;
  }

  await paymentsRepo.createPending({
    userId,
    purpose: PaymentPurpose.WALLET_FUNDING,
    amountKobo: dto.amount_kobo,
    reference,
    authorizationUrl: paystackResult.authorization_url,
    accessCode: paystackResult.access_code,
  });

  const view: FundingInitView = {
    reference,
    paystack_reference: paystackResult.reference,
    amount_kobo: dto.amount_kobo,
    currency: 'NGN',
    authorization_url: paystackResult.authorization_url,
    access_code: paystackResult.access_code,
  };
  return new ServiceSuccess(view, WALLET_MESSAGES.FUNDING_INITIALIZED);
};

// Applies a Paystack verify result inside one tx — locks the payment, marks
// it success/failed, posts the wallet_funding journal on success. Idempotent
// against concurrent webhook arrivals (the journal idempotency key dedupes).
// Returns a ServiceError on a hard failure, or null on success (caller then
// reads `paystackResult.status` to build the view). Extracted to keep
// verifyFunding's cognitive complexity inside the lint cap.
const applyVerifyResult = async (
  userId: string,
  reference: string,
  paystackResult: Awaited<ReturnType<typeof verifyTransaction>>,
): Promise<ServiceError | null> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const fresh = await paymentsRepo.findByReferenceForUpdate(client, reference);
    if (!fresh) {
      await client.query('ROLLBACK');
      return new ServiceError('not_found', WALLET_MESSAGES.FUNDING_FAILED, 404);
    }
    if (fresh.status !== PaymentStatus.SUCCESS && paystackResult.status === 'success') {
      await paymentsRepo.markSuccess(client, {
        paymentId: fresh.id,
        paystackReference: paystackResult.reference,
        paidAt: paystackResult.paid_at ? new Date(paystackResult.paid_at) : new Date(),
        channel: paystackResult.channel,
        feesKobo: paystackResult.fees_kobo,
        rawPayload: paystackResult.raw,
      });
      await applyFunding(client, {
        userId,
        paymentId: fresh.id,
        reference: fresh.reference,
        grossKobo: Number(fresh.amount_kobo),
        feeKobo: paystackResult.fees_kobo,
      });
    } else if (fresh.status === PaymentStatus.PENDING && paystackResult.status !== 'success') {
      await paymentsRepo.markFailed(client, fresh.id, paystackResult.status, paystackResult.raw);
    }
    await client.query('COMMIT');
    return null;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error({ err, reference }, 'verifyFunding tx failed');
    throw err;
  } finally {
    client.release();
  }
};

// ── POST /wallet/fund/verify ────────────────────────────────────────────────
//
// Polling fallback. Webhook is the source of truth — this endpoint just
// asks "did the webhook land?" and, if not, hits Paystack directly to
// confirm. Either way, the funding journal is posted (idempotent) so the
// user's wallet reflects success ASAP.

export const verifyFunding = async (dto: VerifyFundingDto, userId: string) => {
  const payment = await paymentsRepo.findByReference(dto.reference);
  if (!payment || payment.user_id !== userId) {
    return new ServiceError('not_found', WALLET_MESSAGES.FUNDING_FAILED, 404);
  }

  // Already terminal? Just return current state.
  if (payment.status === PaymentStatus.SUCCESS || payment.status === PaymentStatus.FAILED) {
    const view: FundingVerifyView = {
      status: payment.status === PaymentStatus.SUCCESS ? 'success' : 'failed',
      amount_kobo: Number(payment.amount_kobo),
      currency: payment.currency,
      reference: payment.reference,
    };
    return new ServiceSuccess(view, WALLET_MESSAGES.FUNDING_VERIFIED);
  }

  // Still pending — poll Paystack.
  let paystackResult;
  try {
    paystackResult = await verifyTransaction(dto.reference);
  } catch (err) {
    if (err instanceof PaystackUpstreamError) {
      return new ServiceError(
        'upstream_unavailable',
        WALLET_MESSAGES.FUNDING_FAILED,
        502,
        undefined,
        5,
      );
    }
    throw err;
  }

  if (paystackResult.status === 'pending' || paystackResult.status === 'abandoned') {
    const view: FundingVerifyView = {
      status: 'pending',
      amount_kobo: Number(payment.amount_kobo),
      currency: payment.currency,
      reference: payment.reference,
    };
    return new ServiceSuccess(view, WALLET_MESSAGES.FUNDING_PENDING);
  }

  // Apply terminal state inside one tx so the journal + payment update
  // commit together. Idempotent against concurrent webhook arrivals.
  const txResult = await applyVerifyResult(userId, dto.reference, paystackResult);
  if (txResult !== null) {
    return txResult;
  }

  const finalStatus: 'success' | 'failed' =
    paystackResult.status === 'success' ? 'success' : 'failed';
  const view: FundingVerifyView = {
    status: finalStatus,
    amount_kobo: Number(payment.amount_kobo),
    currency: payment.currency,
    reference: payment.reference,
  };
  return new ServiceSuccess(view, WALLET_MESSAGES.FUNDING_VERIFIED);
};

// Wallets are materialized just-in-time by `accountFor.user(userId)` on first
// access — no boot-time pre-create needed. New users see balance=0 from the
// default account_balances row.
