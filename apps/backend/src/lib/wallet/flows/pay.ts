import type { PoolClient } from 'pg';

import { logger } from '@lib/logger.js';
import { insertEvent, OutboxAggregateType, OutboxEventType } from '@lib/outbox/index.js';

import { accountFor } from '../accounts.js';
import { readUserAvailableBalance } from '../balance.js';
import { postJournal } from '../journal.js';

interface QueryRunner {
  query: PoolClient['query'];
}

export const PaymentPurposeEnum = {
  CALL_PAYMENT: 'call_payment',
} as const;

export type PaymentPurpose = (typeof PaymentPurposeEnum)[keyof typeof PaymentPurposeEnum];

export interface ReservePaymentInput {
  userId: string;
  amountKobo: bigint;
  purpose: PaymentPurpose;
  // External system supplies a stable id for what's being paid (call_id,
  // ticket_id, etc). The journal idempotency_key is built from this.
  externalRefId: string;
  // Optional client-supplied idempotency suffix for retry-safety even on the
  // same externalRefId. e.g. when mobile re-clicks Pay after a network blip.
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export interface ReservePaymentSuccess {
  status: 'paid';
  journalId: string;
  alreadyPosted: boolean;
}

export interface ReservePaymentInsufficient {
  status: 'insufficient_balance';
  shortByKobo: bigint;
  currentBalanceKobo: bigint;
}

export type ReservePaymentResult = ReservePaymentSuccess | ReservePaymentInsufficient;

const buildIdempotencyKey = (input: ReservePaymentInput): string => {
  // Convention: <purpose>:<externalRefId>:reserve[:<idempotencyKey>]
  // The idempotency suffix is optional — when omitted, replays of the same
  // (purpose, externalRefId) collapse to the original journal.
  const base = `${input.purpose}:${input.externalRefId}:reserve`;
  return input.idempotencyKey !== undefined ? `${base}:${input.idempotencyKey}` : base;
};

// Reserves payment from a user's wallet by moving money INTO the
// pending_debits_pool account. The user's available balance drops; the money
// is parked until the related resource (e.g. call) settles or refunds.
//
// On insufficient balance, returns `insufficient_balance` WITHOUT throwing or
// posting any journal. Caller decides whether to redirect to fund flow.
//
// Idempotent on `<purpose>:<externalRefId>:reserve[:<idem>]`. A retry with the
// same key returns the original journal (alreadyPosted=true).
//
// Journal:
//   pending_debits_pool: +amount
//   user_wallet:         -amount
export const reservePayment = async (
  input: ReservePaymentInput,
  runner?: QueryRunner,
): Promise<ReservePaymentResult> => {
  if (input.amountKobo <= 0n) {
    throw new Error(`reservePayment: amountKobo must be positive, got ${input.amountKobo}`);
  }

  const balance = await readUserAvailableBalance(input.userId);
  if (balance < input.amountKobo) {
    return {
      status: 'insufficient_balance',
      shortByKobo: input.amountKobo - balance,
      currentBalanceKobo: balance,
    };
  }

  const [userAccount, pendingPool] = await Promise.all([
    accountFor.user(input.userId),
    accountFor.system('pending_debits_pool'),
  ]);

  const idemKey = buildIdempotencyKey(input);
  const isCallPayment = input.purpose === PaymentPurposeEnum.CALL_PAYMENT;
  const result = await postJournal(
    {
      kind: 'call_payment_reserve',
      idempotencyKey: idemKey,
      lines: [
        { accountId: pendingPool.id, signedAmountKobo: Number(input.amountKobo) },
        { accountId: userAccount.id, signedAmountKobo: -Number(input.amountKobo) },
      ],
      ...(isCallPayment ? { relatedCallId: input.externalRefId } : {}),
      relatedUserId: input.userId,
      memo: `Reserved ${input.amountKobo} kobo for ${input.purpose}=${input.externalRefId}`,
    },
    runner,
  );

  if (!result.alreadyPosted) {
    // Only emit the outbox event on the first reserve. Replays don't
    // re-notify; the original notification handled it.
    if (runner !== undefined) {
      await insertEvent(runner, {
        aggregateType: OutboxAggregateType.PAYMENT,
        aggregateId: result.journalId,
        eventType: OutboxEventType.CALL_PAYMENT_RESERVED,
        payload: {
          user_id: input.userId,
          amount_kobo: input.amountKobo.toString(),
          purpose: input.purpose,
          external_ref_id: input.externalRefId,
          journal_id: result.journalId,
        },
      });
    }
    logger.info(
      {
        userId: input.userId,
        amountKobo: input.amountKobo.toString(),
        purpose: input.purpose,
        externalRefId: input.externalRefId,
        journalId: result.journalId,
      },
      'wallet payment reserved',
    );
  }

  return {
    status: 'paid',
    journalId: result.journalId,
    alreadyPosted: result.alreadyPosted,
  };
};
