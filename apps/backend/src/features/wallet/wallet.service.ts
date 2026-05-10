import * as authRepo from '@features/auth/auth.repo.js';
import * as bookingsRepo from '@features/bookings/bookings.repo.js';
import * as callsRepo from '@features/calls/calls.repo.js';
import * as paymentsRepo from '@features/payments/payments.repo.js';
import { PaymentPurpose, PaymentStatus } from '@features/payments/payments.types.js';
import * as profileRepo from '@features/profile/profile.repo.js';
import { platformConfig } from '@lib/config/platform-config.service.js';
import { pool } from '@lib/db/pool.js';
import { newRawId } from '@lib/ids.js';
import { logger } from '@lib/logger.js';
import { koboToJson } from '@lib/money.js';
import { decodeCursor, encodeCursor, resolveLimit } from '@lib/pagination.js';
import {
  createTransferRecipient,
  initializeTransaction,
  initiateTransfer,
  PaystackUpstreamError,
  verifyTransaction,
} from '@lib/paystack/client.js';
import { verifyAndCheckCharge } from '@lib/paystack/verify-charge.js';
import { ServiceError, ServiceSuccess } from '@lib/service-result.js';
import { applyFunding } from '@lib/wallet/flows/funding.js';
import { reservePayment } from '@lib/wallet/flows/pay.js';
import {
  postWithdrawalRequestedJournal,
  postWithdrawalReversedJournal,
} from '@lib/wallet/flows/withdrawal.js';
import { accountFor, readUserAvailableBalance, readUserPendingBalance } from '@lib/wallet/index.js';

import { WALLET_MESSAGES } from './wallet.messages.js';
import * as repo from './wallet.repo.js';
import type {
  InitializeFundingDto,
  ListWithdrawalsQueryDto,
  PayFromWalletDto,
  RequestWithdrawalDto,
  TransactionsQueryDto,
  VerifyFundingDto,
} from './wallet.schema.js';
import type {
  FundingInitView,
  FundingVerifyView,
  InsufficientBalanceView,
  PayResponseView,
  WalletStatsView,
  WalletSummaryView,
  WalletTransactionView,
  WithdrawalView,
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
const describeTransaction = (kind: string, credit: boolean): string => {
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
  // Available is the SUM of every wallet_entry hitting the user's account.
  // Pending is the user's slice of pending_debits_pool. Withdrawable equals
  // available because the reserve journal already subtracted pending from the
  // wallet itself; surfaced separately for client clarity.
  const view: WalletSummaryView = {
    balance_kobo: koboToJson(available),
    pending_balance_kobo: koboToJson(pending),
    withdrawable_balance_kobo: koboToJson(available),
    currency: 'NGN',
  };
  return new ServiceSuccess(view, WALLET_MESSAGES.FETCHED);
};

// ── GET /wallet/stats ────────────────────────────────────────────────────────

export const getStats = async (userId: string) => {
  const row = await repo.readUserWalletStats(userId);
  const totalCallsRow = await pool.query<{ n: string }>(
    `SELECT count(*)::text AS n
       FROM calls c
       JOIN bookings b ON b.id = c.booking_id
      WHERE b.caller_user_id = $1
        AND c.status = 'completed'`,
    [userId],
  );
  const view: WalletStatsView = {
    this_week_kobo: koboToJson(BigInt(row.this_week_kobo)),
    this_month_kobo: koboToJson(BigInt(row.this_month_kobo)),
    total_calls: Number(totalCallsRow.rows[0]?.n ?? '0'),
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
    const signed = BigInt(row.signed_amount_kobo);
    return {
      id: row.entry_id,
      journal_id: row.journal_id,
      reference: row.reference,
      type: journalKindToTxType(row.journal_kind),
      amount_kobo: koboToJson(signed),
      currency: row.currency,
      // status mapping: in slice A every wallet_entry that exists is
      // `completed` — withdrawals (slice B) introduce `pending`/`failed`
      // states by writing distinct journal kinds.
      status: 'completed',
      occurred_at: row.occurred_at.toISOString(),
      description: describeTransaction(row.journal_kind, signed > 0n),
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
    amount_kobo: koboToJson(BigInt(dto.amount_kobo)),
    currency: 'NGN',
    authorization_url: paystackResult.authorization_url,
    access_code: paystackResult.access_code,
  };
  return new ServiceSuccess(view, WALLET_MESSAGES.FUNDING_INITIALIZED);
};

// Applies a Paystack verify result inside one tx — locks the payment, runs
// the same structural checks the webhook does (currency, customer email,
// fee-aware amount mismatch), then marks it success/failed and posts the
// wallet_funding journal on success. Idempotent against concurrent webhook
// arrivals (the journal idempotency key dedupes). Returns a ServiceError on
// rejection, or null on success/failed-marked (caller then reads
// `paystackResult.status` to build the view).
const applyVerifyResult = async (
  userId: string,
  reference: string,
  paystackResult: Awaited<ReturnType<typeof verifyTransaction>>,
): Promise<ServiceError | null> => {
  logger.info(paystackResult);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const fresh = await paymentsRepo.findByReferenceForUpdate(client, reference);
    if (!fresh) {
      await client.query('ROLLBACK');
      return new ServiceError('not_found', WALLET_MESSAGES.FUNDING_FAILED, 404);
    }
    if (fresh.status !== PaymentStatus.SUCCESS && paystackResult.status === 'success') {
      // Run the shared structural + fee-aware amount check. This re-fetches
      // verification (cheap; same merchant key, idempotent) and rejects on
      // currency / email / amount mismatches. Returning null signals "do not
      // credit" — we treat this as a failed verification rather than rolling
      // back, so the user gets a clear failed status.
      const verified = await verifyAndCheckCharge(client, fresh);
      if (!verified) {
        await paymentsRepo.markFailed(client, fresh.id, 'verification_rejected', paystackResult.raw);
        await client.query('COMMIT');
        return new ServiceError('upstream_unavailable', WALLET_MESSAGES.FUNDING_FAILED, 422);
      }
      await paymentsRepo.markSuccess(client, {
        paymentId: fresh.id,
        paystackReference: paystackResult.reference,
        paidAt: verified.paidAt,
        channel: verified.channel,
        feesKobo: verified.feesKobo,
        rawPayload: paystackResult.raw,
      });
      // Credit what we actually received from Paystack (verified gross −
      // verified fees). In pass-on fee mode this equals the authorized amount;
      // in default mode it's slightly less. The journal lines balance because
      // applyFunding derives the fee bucket from `gross − net`.
      await applyFunding(client, {
        userId,
        paymentId: fresh.id,
        reference: fresh.reference,
        grossKobo: verified.amountKobo,
        feeKobo: verified.feesKobo,
        netCreditKobo: verified.amountKobo - verified.feesKobo,
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
      amount_kobo: koboToJson(BigInt(payment.amount_kobo)),
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
      amount_kobo: koboToJson(BigInt(payment.amount_kobo)),
      currency: payment.currency,
      reference: payment.reference,
    };
    return new ServiceSuccess(view, WALLET_MESSAGES.FUNDING_PENDING);
  }
  await paymentsRepo.updateSettledAmount(payment.id, paystackResult.amount_kobo);
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
    amount_kobo: koboToJson(BigInt(payment.amount_kobo)),
    currency: payment.currency,
    reference: payment.reference,
  };
  return new ServiceSuccess(view, WALLET_MESSAGES.FUNDING_VERIFIED);
};

// Wallets are materialized just-in-time by `accountFor.user(userId)` on first
// access — no boot-time pre-create needed. New users see balance=0 from the
// default account_balances row.

// ── POST /wallet/pay ────────────────────────────────────────────────────────
//
// Wallet-first payment: debits the user's wallet directly into the
// pending_debits_pool. Mobile uses this for call payments. On insufficient
// balance, returns 409 with a `short_by_kobo` so mobile can redirect to the
// fund flow and retry. The journal id returned IS the receipt — settlement
// happens later (via the calls feature in §8).

const SUFFICIENT_BUFFER_KOBO = 50_000n; // ₦500 buffer above shortfall for retry safety.

export const payFromWallet = async (
  dto: PayFromWalletDto,
  userId: string,
): Promise<ServiceSuccess<PayResponseView | InsufficientBalanceView> | ServiceError> => {
  if (dto.purpose === 'call_payment') {
    const call = await callsRepo.findById(dto.external_ref_id);
    if (!call) {
      return new ServiceError('not_found', WALLET_MESSAGES.PAY_TARGET_NOT_FOUND, 404, {
        external_ref_id: ['Call not found'],
      });
    }
    const booking = await bookingsRepo.findById(call.booking_id);
    if (!booking || booking.caller_user_id !== userId) {
      // Same shape as call-not-found — don't differentiate, that would let
      // a malicious caller probe other users' call ids.
      return new ServiceError('not_found', WALLET_MESSAGES.PAY_TARGET_NOT_FOUND, 404, {
        external_ref_id: ['Call not found'],
      });
    }
  }

  // Materialize the user wallet if missing (first-time payer with promo credit).
  await accountFor.user(userId);

  const result = await reservePayment({
    userId,
    amountKobo: BigInt(dto.amount_kobo),
    purpose: 'call_payment',
    externalRefId: dto.external_ref_id,
    ...(dto.metadata !== undefined ? { metadata: dto.metadata } : {}),
  });

  if (result.status === 'insufficient_balance') {
    const view: InsufficientBalanceView = {
      status: 'insufficient_balance',
      short_by_kobo: koboToJson(result.shortByKobo),
      current_balance_kobo: koboToJson(result.currentBalanceKobo),
      suggested_funding_amount_kobo: koboToJson(result.shortByKobo + SUFFICIENT_BUFFER_KOBO),
      currency: 'NGN',
    };
    return new ServiceSuccess(view, WALLET_MESSAGES.PAY_INSUFFICIENT);
  }

  const view: PayResponseView = {
    status: 'paid',
    journal_id: result.journalId,
    amount_kobo: koboToJson(BigInt(dto.amount_kobo)),
    currency: 'NGN',
    purpose: dto.purpose,
    metadata: dto.metadata ?? {},
    paid_at: new Date().toISOString(),
  };
  return new ServiceSuccess(view, WALLET_MESSAGES.PAY_OK);
};

// ── POST /wallet/withdraw ───────────────────────────────────────────────────
//
// Initiate a withdrawal. Validates the user has a saved bank account, has
// enough wallet balance, and isn't over the daily/cooldown caps. Creates a
// withdrawal row + posts the `withdrawal_requested` journal in one tx, then
// kicks off the Paystack transfer. The webhook drives terminal state.

const maskAccountNumber = (accountNumber: string): string => {
  if (accountNumber.length <= 4) return accountNumber;
  return `${'*'.repeat(accountNumber.length - 4)}${accountNumber.slice(-4)}`;
};

const withdrawalRowToView = (row: {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'reversed';
  amount_kobo: string;
  currency: string;
  bank_snapshot: { bank_name: string; account_number: string };
  failure_reason: string | null;
  requested_at: Date;
  processed_at: Date | null;
}): WithdrawalView => ({
  id: row.id,
  status: row.status,
  amount_kobo: koboToJson(BigInt(row.amount_kobo)),
  currency: row.currency,
  bank_name: row.bank_snapshot.bank_name,
  account_number_masked: maskAccountNumber(row.bank_snapshot.account_number),
  failure_reason: row.failure_reason,
  requested_at: row.requested_at.toISOString(),
  processed_at: row.processed_at ? row.processed_at.toISOString() : null,
});

interface RequestWithdrawalContext {
  dto: RequestWithdrawalDto;
  userId: string;
  idempotencyKey: string | null;
}

interface WalletConfigSnapshot {
  min_withdrawal_kobo: number;
  max_withdrawal_per_day_kobo: number;
  max_withdrawals_per_day: number;
  withdrawal_cooldown_seconds: number;
}

const validateWithdrawalRequest = async (
  userId: string,
  amount: bigint,
  cfg: WalletConfigSnapshot,
): Promise<ServiceError | null> => {
  if (amount < BigInt(cfg.min_withdrawal_kobo)) {
    return new ServiceError('value_out_of_range', WALLET_MESSAGES.WITHDRAWAL_CONFLICT, 422, {
      amount_kobo: [`amount_kobo must be at least ${cfg.min_withdrawal_kobo}`],
    });
  }
  const last = await repo.lastWithdrawalRequestAtForUser(userId);
  if (last) {
    const elapsed = (Date.now() - last.getTime()) / 1000;
    if (elapsed < cfg.withdrawal_cooldown_seconds) {
      return new ServiceError(
        'rate_limited',
        WALLET_MESSAGES.WITHDRAWAL_CONFLICT,
        429,
        undefined,
        Math.ceil(cfg.withdrawal_cooldown_seconds - elapsed),
      );
    }
  }
  const today = await repo.countWithdrawalsTodayForUser(userId);
  if (today.count >= cfg.max_withdrawals_per_day) {
    return new ServiceError('rate_limited', WALLET_MESSAGES.WITHDRAWAL_CONFLICT, 429);
  }
  if (today.sumKobo + amount > BigInt(cfg.max_withdrawal_per_day_kobo)) {
    return new ServiceError('value_out_of_range', WALLET_MESSAGES.WITHDRAWAL_CONFLICT, 422, {
      amount_kobo: ['Daily withdrawal cap exceeded'],
    });
  }
  const balance = await readUserAvailableBalance(userId);
  if (balance < amount) {
    return new ServiceError('insufficient_balance', WALLET_MESSAGES.WITHDRAWAL_CONFLICT, 409);
  }
  return null;
};

interface BankAccountInfo {
  account_number: string;
  bank_code: string;
  bank_name: string;
  account_name: string;
  paystack_recipient_code: string | null;
}

const ensureRecipientCode = async (
  userId: string,
  bank: BankAccountInfo,
): Promise<{ recipientCode: string } | ServiceError> => {
  if (bank.paystack_recipient_code) {
    return { recipientCode: bank.paystack_recipient_code };
  }
  try {
    const created = await createTransferRecipient({
      name: bank.account_name,
      accountNumber: bank.account_number,
      bankCode: bank.bank_code,
    });
    await repo.setWithdrawalRecipient(userId, created.recipient_code);
    return { recipientCode: created.recipient_code };
  } catch (err) {
    if (err instanceof PaystackUpstreamError) {
      return new ServiceError(
        'upstream_unavailable',
        WALLET_MESSAGES.WITHDRAWAL_CONFLICT,
        502,
        undefined,
        5,
      );
    }
    throw err;
  }
};

const createWithdrawalRowAndJournal = async (input: {
  userId: string;
  amount: bigint;
  recipientCode: string;
  bankSnapshot: repo.BankSnapshot;
  idempotencyKey: string | null;
}): Promise<repo.WithdrawalRow> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const withdrawalRow = await repo.createWithdrawal(client, {
      userId: input.userId,
      amountKobo: input.amount,
      recipientCode: input.recipientCode,
      bankSnapshot: input.bankSnapshot,
      idempotencyKey: input.idempotencyKey,
    });
    await postWithdrawalRequestedJournal(client, {
      withdrawalId: withdrawalRow.id,
      userId: input.userId,
      amountKobo: input.amount,
    });
    await client.query('COMMIT');
    return withdrawalRow;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error({ err, userId: input.userId }, 'requestWithdrawal tx failed');
    throw err;
  } finally {
    client.release();
  }
};

const setProcessing = async (
  withdrawalId: string,
  transferCode: string,
  paystackId: number | null,
): Promise<void> => {
  const innerClient = await pool.connect();
  try {
    await innerClient.query('BEGIN');
    await repo.setWithdrawalProcessing(
      innerClient,
      withdrawalId,
      transferCode,
      paystackId !== null ? String(paystackId) : null,
    );
    await innerClient.query('COMMIT');
  } catch (err) {
    await innerClient.query('ROLLBACK').catch(() => {});
    logger.error({ err, withdrawalId }, 'set withdrawal processing failed');
  } finally {
    innerClient.release();
  }
};

// On synchronous Paystack rejection (recipient invalid, account closed, etc),
// the withdrawal must NOT stay pending — the user's funds would sit in
// pending_debits_pool indefinitely. Mark the row failed and post the reversal
// journal so the wallet is restored. See QA finding OPS-NEW-02.
const handleSyncTransferRejection = async (
  withdrawalRow: repo.WithdrawalRow,
  amount: bigint,
  reason: string,
): Promise<repo.WithdrawalRow> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await postWithdrawalReversedJournal(client, {
      withdrawalId: withdrawalRow.id,
      userId: withdrawalRow.user_id,
      amountKobo: amount,
    });
    await repo.setWithdrawalFailed(client, withdrawalRow.id, reason);
    await client.query('COMMIT');
    logger.warn(
      { withdrawalId: withdrawalRow.id, reason },
      'paystack rejected /transfer synchronously; withdrawal marked failed + reversed',
    );
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error(
      { err, withdrawalId: withdrawalRow.id },
      'sync-rejection cleanup tx failed; row stays pending — manual intervention required',
    );
    return withdrawalRow;
  } finally {
    client.release();
  }
  const refreshed = await repo.findWithdrawalById(withdrawalRow.id);
  return refreshed ?? withdrawalRow;
};

const fireTransferAndUpdate = async (
  withdrawalRow: repo.WithdrawalRow,
  recipientCode: string,
  amount: bigint,
): Promise<repo.WithdrawalRow> => {
  try {
    const transfer = await initiateTransfer({
      recipientCode,
      amountKobo: Number(amount),
      // Use the bare withdrawal id — it already carries the `wd_` prefix.
      // See QA finding OPS-NEW-01: doubling the prefix made the wire format
      // diverge from our row id, breaking ops/support lookups.
      reference: withdrawalRow.id,
      reason: 'Ohlify withdrawal',
    });
    await setProcessing(withdrawalRow.id, transfer.transfer_code, transfer.paystack_id);
    const refreshed = await repo.findWithdrawalById(withdrawalRow.id);
    return refreshed ?? withdrawalRow;
  } catch (err) {
    if (err instanceof PaystackUpstreamError) {
      return handleSyncTransferRejection(
        withdrawalRow,
        amount,
        `paystack rejected transfer: ${err.message}`,
      );
    }
    throw err;
  }
};

export const requestWithdrawal = async (
  ctx: RequestWithdrawalContext,
): Promise<ServiceSuccess<WithdrawalView> | ServiceError> => {
  if (ctx.idempotencyKey) {
    const replay = await repo.findWithdrawalByIdempotencyKey(ctx.userId, ctx.idempotencyKey);
    if (replay) {
      return new ServiceSuccess(withdrawalRowToView(replay), WALLET_MESSAGES.WITHDRAWAL_REQUESTED);
    }
  }

  const cfg = platformConfig.wallet();
  const amount = BigInt(ctx.dto.amount_kobo);

  const bank = await profileRepo.findBankAccount(ctx.userId);
  if (!bank) {
    return new ServiceError('no_bank_account', WALLET_MESSAGES.WITHDRAWAL_NO_BANK, 409);
  }

  const validationError = await validateWithdrawalRequest(ctx.userId, amount, cfg);
  if (validationError) return validationError;

  const recipientResult = await ensureRecipientCode(ctx.userId, bank);
  if (recipientResult instanceof ServiceError) return recipientResult;
  const recipientCode = recipientResult.recipientCode;

  const bankSnapshot: repo.BankSnapshot = {
    account_number: bank.account_number,
    bank_code: bank.bank_code,
    bank_name: bank.bank_name,
    account_name: bank.account_name,
  };

  const withdrawalRow = await createWithdrawalRowAndJournal({
    userId: ctx.userId,
    amount,
    recipientCode,
    bankSnapshot,
    idempotencyKey: ctx.idempotencyKey,
  });

  if (cfg.payout_mode === 'manual_review') {
    logger.info(
      { withdrawalId: withdrawalRow.id, mode: cfg.payout_mode },
      'withdrawal awaiting manual review',
    );
    return new ServiceSuccess(
      withdrawalRowToView(withdrawalRow),
      WALLET_MESSAGES.WITHDRAWAL_REQUESTED,
    );
  }

  const finalRow = await fireTransferAndUpdate(withdrawalRow, recipientCode, amount);
  return new ServiceSuccess(withdrawalRowToView(finalRow), WALLET_MESSAGES.WITHDRAWAL_REQUESTED);
};

// ── GET /wallet/withdrawals ─────────────────────────────────────────────────

export const listWithdrawals = async (dto: ListWithdrawalsQueryDto, userId: string) => {
  const limit = resolveLimit(dto.limit);
  let cursor: { last_id: string; last_sort_key: string } | undefined;
  if (dto.cursor !== undefined) {
    try {
      cursor = decodeCursor(dto.cursor);
    } catch {
      return new ServiceError('validation_error', WALLET_MESSAGES.WITHDRAWALS_LIST_FETCHED, 400, {
        cursor: ['Invalid cursor'],
      });
    }
  }
  const rows = await repo.listWithdrawalsForUser({
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
      ? encodeCursor({ last_id: last.id, last_sort_key: last.requested_at.toISOString() })
      : null;

  return new ServiceSuccess(
    {
      items: page.map(withdrawalRowToView),
      meta: { next_cursor: nextCursor, has_more: hasMore },
    },
    WALLET_MESSAGES.WITHDRAWALS_LIST_FETCHED,
  );
};

// ── GET /wallet/withdrawals/:id ─────────────────────────────────────────────

export const getWithdrawal = async (withdrawalId: string, userId: string) => {
  const row = await repo.findWithdrawalById(withdrawalId);
  if (!row || row.user_id !== userId) {
    return new ServiceError('not_found', WALLET_MESSAGES.WITHDRAWAL_NOT_FOUND, 404);
  }
  return new ServiceSuccess(withdrawalRowToView(row), WALLET_MESSAGES.WITHDRAWAL_FETCHED);
};
