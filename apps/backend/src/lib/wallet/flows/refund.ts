import type { PoolClient } from 'pg';

import { logger } from '@lib/logger.js';
import { insertEvent, OutboxAggregateType, OutboxEventType } from '@lib/outbox/index.js';

import { computePlatformFee } from '../accounting.js';
import { accountFor } from '../accounts.js';
import { postJournal } from '../journal.js';

interface QueryRunner {
  query: PoolClient['query'];
}

export interface PreSettleRefundInput {
  callId: string;
  payerUserId: string;
  amountKobo: bigint;
  // Refund-request id (or any unique reason tag) — combined with callId to
  // form the idempotency key. Lets us issue multiple distinct refund attempts
  // tied to the same call, each idempotent on its own id.
  refundRequestId: string;
}

export interface PostSettleRefundInput {
  callId: string;
  payerUserId: string;
  payeeUserId: string;
  amountKobo: bigint;
  feeBps: number;
  refundRequestId: string;
}

export interface RefundResult {
  journalId: string;
  alreadyPosted: boolean;
}

// Pre-settlement refund (call cancelled before completion). Releases the
// reserved amount back to the payer and clears the pending pool.
//
// Journal:
//   user_wallet(payer): +amount
//   pending_debits_pool: -amount
//
// Idempotent on `call:<callId>:refund:<refundRequestId>`.
export const refundReserve = async (
  runner: QueryRunner,
  input: PreSettleRefundInput,
): Promise<RefundResult> => {
  if (input.amountKobo <= 0n) {
    throw new Error('refundReserve: amountKobo must be positive');
  }
  const [payerAccount, pendingPool] = await Promise.all([
    accountFor.user(input.payerUserId),
    accountFor.system('pending_debits_pool'),
  ]);

  const result = await postJournal(
    {
      kind: 'call_refund',
      idempotencyKey: `call:${input.callId}:refund:${input.refundRequestId}`,
      lines: [
        { accountId: payerAccount.id, signedAmountKobo: Number(input.amountKobo) },
        { accountId: pendingPool.id, signedAmountKobo: -Number(input.amountKobo) },
      ],
      relatedCallId: input.callId,
      relatedUserId: input.payerUserId,
      memo: `Pre-settle refund call=${input.callId} request=${input.refundRequestId}`,
    },
    runner,
  );

  if (!result.alreadyPosted) {
    await insertEvent(runner, {
      aggregateType: OutboxAggregateType.CALL,
      aggregateId: input.callId,
      eventType: OutboxEventType.CALL_REFUNDED,
      payload: {
        call_id: input.callId,
        payer_user_id: input.payerUserId,
        amount_kobo: input.amountKobo.toString(),
        phase: 'pre_settle',
        refund_request_id: input.refundRequestId,
      },
    });
    logger.info(
      {
        callId: input.callId,
        payerUserId: input.payerUserId,
        amountKobo: input.amountKobo.toString(),
        phase: 'pre_settle',
      },
      'call refund posted',
    );
  }

  return {
    journalId: result.journalId,
    alreadyPosted: result.alreadyPosted,
  };
};

// Post-settlement refund (call already settled, admin clawback). Reverses
// the original settlement: clawback the payee, refund platform_revenue, and
// credit the payer.
//
// Journal:
//   user_wallet(payer):  +amount
//   user_wallet(payee):  -(amount - fee)
//   platform_revenue:    -fee
//
// Idempotent on `refund:<refundRequestId>` (no call: prefix because the
// admin may post multiple refunds on the same call across different
// requests; the request_id is the unique anchor).
export const refundPostSettle = async (
  runner: QueryRunner,
  input: PostSettleRefundInput,
): Promise<RefundResult> => {
  if (input.amountKobo <= 0n) {
    throw new Error('refundPostSettle: amountKobo must be positive');
  }
  const feeKobo = BigInt(computePlatformFee(Number(input.amountKobo), input.feeBps));
  const netKobo = input.amountKobo - feeKobo;

  const [payerAccount, payeeAccount, platformRevenue] = await Promise.all([
    accountFor.user(input.payerUserId),
    accountFor.user(input.payeeUserId),
    accountFor.system('platform_revenue'),
  ]);

  const result = await postJournal(
    {
      kind: 'call_refund_post_settle',
      idempotencyKey: `refund:${input.refundRequestId}`,
      lines: [
        { accountId: payerAccount.id, signedAmountKobo: Number(input.amountKobo) },
        { accountId: payeeAccount.id, signedAmountKobo: -Number(netKobo) },
        ...(feeKobo > 0n
          ? [{ accountId: platformRevenue.id, signedAmountKobo: -Number(feeKobo) }]
          : []),
      ],
      relatedCallId: input.callId,
      relatedUserId: input.payerUserId,
      memo: `Post-settle refund call=${input.callId} request=${input.refundRequestId} (clawback payee ${netKobo}, platform ${feeKobo})`,
    },
    runner,
  );

  if (!result.alreadyPosted) {
    await insertEvent(runner, {
      aggregateType: OutboxAggregateType.CALL,
      aggregateId: input.callId,
      eventType: OutboxEventType.CALL_REFUNDED,
      payload: {
        call_id: input.callId,
        payer_user_id: input.payerUserId,
        payee_user_id: input.payeeUserId,
        amount_kobo: input.amountKobo.toString(),
        clawback_kobo: netKobo.toString(),
        clawback_fee_kobo: feeKobo.toString(),
        phase: 'post_settle',
        refund_request_id: input.refundRequestId,
      },
    });
    logger.info(
      {
        callId: input.callId,
        payerUserId: input.payerUserId,
        payeeUserId: input.payeeUserId,
        amountKobo: input.amountKobo.toString(),
        phase: 'post_settle',
      },
      'call refund posted',
    );
  }

  return {
    journalId: result.journalId,
    alreadyPosted: result.alreadyPosted,
  };
};
