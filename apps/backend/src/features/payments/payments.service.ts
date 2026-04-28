import type { PoolClient } from 'pg';

import * as walletRepo from '@features/wallet/wallet.repo.js';
import { pool } from '@lib/db/pool.js';
import { logger } from '@lib/logger.js';
import { ServiceError, ServiceSuccess } from '@lib/service-result.js';
import { applyFunding } from '@lib/wallet/flows/funding.js';
import {
  postWithdrawalCompletedJournal,
  postWithdrawalReversedJournal,
} from '@lib/wallet/flows/withdrawal.js';
import { MESSAGE_KEYS } from '@shared/constants/message-keys.js';

import * as repo from './payments.repo.js';
import {
  PaymentPurpose,
  PaymentStatus,
  type PaymentRow,
  type PaymentView,
} from './payments.types.js';
import * as webhookRepo from './webhook-repo.js';

const toView = (row: PaymentRow): PaymentView => ({
  id: row.id,
  reference: row.reference,
  purpose: row.purpose,
  status: row.status,
  amount_kobo: Number(row.amount_kobo),
  currency: row.currency,
  channel: row.channel,
  paid_at: row.paid_at ? row.paid_at.toISOString() : null,
  call_id: row.call_id,
  created_at: row.created_at.toISOString(),
});

// ── GET /payments/:reference ────────────────────────────────────────────────

export const getByReference = async (reference: string, userId: string) => {
  const row = await repo.findByReference(reference);
  if (!row || row.user_id !== userId) {
    return new ServiceError('not_found', MESSAGE_KEYS.PAYMENT_NOT_FOUND, 404);
  }
  return new ServiceSuccess(toView(row), MESSAGE_KEYS.PAYMENT_FETCHED);
};

// ── POST /webhooks/paystack ─────────────────────────────────────────────────
//
// Exactly-once processing per correctness.md §9. The handler:
//   1. Inserts paystack_webhooks(event_id) — if the event_id collides with a
//      previous delivery, the insert is a no-op and we return early (200).
//   2. Inside the same tx, dispatches by event_type. For charge.success, this
//      means: lock the payments row, mark success, post the wallet_funding
//      journal (idempotent on `funding:<reference>`), insert outbox event.
//   3. markProcessed marks the envelope.
//
// Any exception inside the tx rolls back EVERYTHING — webhook envelope insert,
// payment update, journal lines. The caller (Paystack) receives non-2xx and
// re-delivers. Replays are safe because the journal idempotency key is
// derived from the reference, not the event_id.

export interface PaystackWebhookEvent {
  event: string;
  data?: Record<string, unknown>;
}

const eventIdFor = (raw: unknown): string => {
  // Paystack puts a stable id on the data object for chargeable events. For
  // non-data events (transfer.failed comes through with `data.id`), same.
  // Fall back to a hash of the raw body when missing — last resort.
  if (
    raw !== null &&
    typeof raw === 'object' &&
    'data' in raw &&
    typeof (raw as { data?: unknown }).data === 'object' &&
    (raw as { data?: unknown }).data !== null
  ) {
    const data = (raw as { data: Record<string, unknown> }).data;
    if (typeof data['id'] === 'string' || typeof data['id'] === 'number') {
      return `paystack:${String(data['id'])}`;
    }
    if (typeof data['reference'] === 'string') {
      return `paystack-ref:${data['reference']}`;
    }
  }
  // Synthetic — extremely unlikely path. Just record the timestamp + a hash.
  return `paystack-unknown:${Date.now()}`;
};

interface ChargeSuccessData {
  status?: string;
  reference?: string;
  amount?: number;
  fees?: number;
  channel?: string;
  paid_at?: string;
  metadata?: Record<string, unknown> | null;
  customer?: { email?: string };
}

const handleChargeSuccess = async (
  runner: PoolClient,
  data: ChargeSuccessData,
  rawPayload: unknown,
): Promise<void> => {
  const reference = data.reference;
  if (typeof reference !== 'string') {
    throw new Error('charge.success missing data.reference');
  }
  const payment = await repo.findByReferenceForUpdate(runner, reference);
  if (!payment) {
    // Charge for a reference we didn't issue. Could be a different merchant
    // account leaking, or test traffic. Log and exit cleanly — the envelope
    // is still recorded for forensics.
    logger.warn({ reference }, 'paystack charge.success for unknown reference; ignoring');
    return;
  }
  if (payment.status === PaymentStatus.SUCCESS) {
    // Already processed by a prior delivery or by the verify polling path.
    return;
  }

  const paidAt = data.paid_at ? new Date(data.paid_at) : new Date();
  const channel = typeof data.channel === 'string' ? data.channel : null;
  const fees = typeof data.fees === 'number' ? data.fees : null;

  await repo.markSuccess(runner, {
    paymentId: payment.id,
    paystackReference: reference,
    paidAt,
    channel,
    feesKobo: fees,
    rawPayload,
  });

  if (payment.purpose === PaymentPurpose.WALLET_FUNDING) {
    await applyFunding(runner, {
      userId: payment.user_id,
      paymentId: payment.id,
      reference: payment.reference,
      grossKobo: Number(payment.amount_kobo),
      feeKobo: fees,
    });
  } else if (payment.purpose === PaymentPurpose.CALL_PAYMENT) {
    // Slice A doesn't have call payments going through Paystack — but the
    // skeleton is here for §8. Today, just mark the payment success without
    // posting any journal. §8 will wire applyCallPayment in this branch.
    logger.info(
      { paymentId: payment.id, callId: payment.call_id },
      'call_payment success ignored in slice A — wallet flow handles call payments now',
    );
  }
};

const handleChargeFailed = async (
  runner: PoolClient,
  data: ChargeSuccessData,
  rawPayload: unknown,
): Promise<void> => {
  const reference = data.reference;
  if (typeof reference !== 'string') return;
  const payment = await repo.findByReferenceForUpdate(runner, reference);
  if (!payment || payment.status !== PaymentStatus.PENDING) return;
  await repo.markFailed(runner, payment.id, data.status ?? 'failed', rawPayload);
};

interface TransferEventData {
  transfer_code?: string;
  reference?: string;
  status?: string;
  reason?: string | null;
  failure_reason?: string | null;
}

const findWithdrawalForTransfer = async (
  runner: PoolClient,
  data: TransferEventData,
): Promise<walletRepo.WithdrawalRow | null> => {
  // Prefer the transfer_code (stored on the withdrawal row at initiation
  // time). Fall back to the reference, which we set to `wd_<id>`.
  if (typeof data.transfer_code === 'string') {
    const row = await walletRepo.findWithdrawalByTransferCode(runner, data.transfer_code);
    if (row) return row;
  }
  if (typeof data.reference === 'string' && data.reference.startsWith('wd_')) {
    const wdId = data.reference.slice(3);
    const row = await walletRepo.findWithdrawalByIdForUpdate(runner, wdId);
    if (row) return row;
  }
  return null;
};

const handleTransferSuccess = async (
  runner: PoolClient,
  data: TransferEventData,
): Promise<void> => {
  const wd = await findWithdrawalForTransfer(runner, data);
  if (!wd) {
    logger.warn({ transferCode: data.transfer_code }, 'transfer.success for unknown withdrawal');
    return;
  }
  if (wd.status === 'completed') return;
  if (wd.status === 'failed' || wd.status === 'reversed') {
    logger.warn(
      { withdrawalId: wd.id, status: wd.status },
      'transfer.success for already-terminal withdrawal',
    );
    return;
  }
  await postWithdrawalCompletedJournal(runner, {
    withdrawalId: wd.id,
    userId: wd.user_id,
    amountKobo: BigInt(wd.amount_kobo),
  });
  await walletRepo.setWithdrawalCompleted(runner, wd.id);
};

const handleTransferFailed = async (runner: PoolClient, data: TransferEventData): Promise<void> => {
  const wd = await findWithdrawalForTransfer(runner, data);
  if (!wd) {
    logger.warn({ transferCode: data.transfer_code }, 'transfer.failed for unknown withdrawal');
    return;
  }
  if (wd.status === 'failed' || wd.status === 'reversed' || wd.status === 'completed') return;
  const reason = data.failure_reason ?? data.reason ?? 'paystack transfer failed';
  await postWithdrawalReversedJournal(runner, {
    withdrawalId: wd.id,
    userId: wd.user_id,
    amountKobo: BigInt(wd.amount_kobo),
  });
  await walletRepo.setWithdrawalFailed(runner, wd.id, reason);
};

const handleTransferReversed = async (
  runner: PoolClient,
  data: TransferEventData,
): Promise<void> => {
  const wd = await findWithdrawalForTransfer(runner, data);
  if (!wd) {
    logger.warn({ transferCode: data.transfer_code }, 'transfer.reversed for unknown withdrawal');
    return;
  }
  if (wd.status === 'reversed') return;
  // For reversed events on a withdrawal that was already completed (rare —
  // bank rejected after success), we post the reversed journal and flip
  // status. If still in flight, same effect.
  const reason = data.failure_reason ?? data.reason ?? 'paystack transfer reversed';
  await postWithdrawalReversedJournal(runner, {
    withdrawalId: wd.id,
    userId: wd.user_id,
    amountKobo: BigInt(wd.amount_kobo),
  });
  await walletRepo.setWithdrawalReversed(runner, wd.id, reason);
};

// Dispatcher — exported so admin replay can reuse without re-inserting the
// envelope. Caller owns the tx.
export const dispatchPaystackEvent = async (
  runner: PoolClient,
  eventType: string,
  parsed: PaystackWebhookEvent,
): Promise<void> => {
  const data = (parsed.data ?? {}) as ChargeSuccessData & TransferEventData;
  switch (eventType) {
    case 'charge.success':
      await handleChargeSuccess(runner, data, parsed);
      break;
    case 'charge.failed':
      await handleChargeFailed(runner, data, parsed);
      break;
    case 'transfer.success':
      await handleTransferSuccess(runner, data);
      break;
    case 'transfer.failed':
      await handleTransferFailed(runner, data);
      break;
    case 'transfer.reversed':
      await handleTransferReversed(runner, data);
      break;
    default:
      logger.info({ eventType }, 'paystack webhook event_type not handled');
      break;
  }
};

export const processWebhook = async (input: {
  signatureHeader: string;
  rawBody: Buffer;
}): Promise<{ accepted: boolean; reason?: string }> => {
  let parsed: PaystackWebhookEvent;
  try {
    parsed = JSON.parse(input.rawBody.toString('utf8')) as PaystackWebhookEvent;
  } catch {
    return { accepted: false, reason: 'malformed_json' };
  }
  if (typeof parsed.event !== 'string') {
    return { accepted: false, reason: 'missing_event_type' };
  }

  const eventId = eventIdFor(parsed);
  const eventType = parsed.event;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const dedupe = await webhookRepo.insertIfAbsent(client, {
      eventId,
      eventType,
      signature: input.signatureHeader,
      rawBody: parsed,
    });
    if (!dedupe.inserted || !dedupe.webhookId) {
      await client.query('COMMIT');
      return { accepted: true, reason: 'duplicate_no_op' };
    }

    let processError: string | null = null;
    try {
      await dispatchPaystackEvent(client, eventType, parsed);
    } catch (err) {
      processError = err instanceof Error ? err.message : String(err);
      logger.error({ err, eventId, eventType }, 'paystack webhook processing failed');
    }

    await webhookRepo.markProcessed(client, dedupe.webhookId, processError);

    if (processError !== null) {
      // Roll back the entire tx so neither the envelope insert NOR any
      // partial business writes commit. Paystack will retry.
      await client.query('ROLLBACK');
      return { accepted: false, reason: processError };
    }

    await client.query('COMMIT');
    return { accepted: true };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error({ err }, 'paystack webhook tx failed');
    return { accepted: false, reason: 'tx_error' };
  } finally {
    client.release();
  }
};

// Re-runs business processing against a stored envelope without going through
// the event_id dedupe path. Journal idempotency keys still protect the ledger
// from double-posting; this is the right tool when the envelope was recorded
// but processing crashed AFTER the journal posted (rare) or when ops needs to
// re-trigger transfer.* handling for a stuck withdrawal.
export const replayWebhookEnvelope = async (input: {
  rawBody: unknown;
}): Promise<{ accepted: boolean; reason?: string }> => {
  const parsed = input.rawBody as PaystackWebhookEvent;
  if (typeof parsed.event !== 'string') {
    return { accepted: false, reason: 'missing_event_type' };
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await dispatchPaystackEvent(client, parsed.event, parsed);
    await client.query('COMMIT');
    return { accepted: true };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    const reason = err instanceof Error ? err.message : 'replay_error';
    logger.error({ err }, 'paystack webhook replay failed');
    return { accepted: false, reason };
  } finally {
    client.release();
  }
};
