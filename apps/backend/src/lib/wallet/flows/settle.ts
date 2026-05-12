import type { PoolClient } from 'pg';

import { logger } from '@lib/logger.js';
import { insertEvent, OutboxAggregateType, OutboxEventType } from '@lib/outbox/index.js';

import { computePlatformFee } from '../accounting.js';
import { accountFor } from '../accounts.js';
import { postJournal } from '../journal.js';

interface QueryRunner {
  query: PoolClient['query'];
}

export interface SettleCallInput {
  callId: string;
  payeeUserId: string;
  amountKobo: bigint;
  feeBps: number;
}

export interface SettleCallResult {
  journalId: string;
  alreadyPosted: boolean;
  payeeNetKobo: bigint;
  platformFeeKobo: bigint;
}

// Settles a call payment that was previously reserved. Splits the amount
// between the payee (callee) and platform_revenue, releases the reserve.
//
// Journal:
//   payee_wallet:        +(amount - fee)
//   platform_revenue:    +fee
//   pending_debits_pool: -amount
//
// Idempotent on `call:<callId>:settle`. A retry returns the original journal.
//
// Used by §8 (call completion) and the admin settle-pending-debit endpoint.
// Must be called inside a tx so the settlement and the related resource
// state change commit together.
export const settleCallPayment = async (
  runner: QueryRunner,
  input: SettleCallInput,
): Promise<SettleCallResult> => {
  if (input.amountKobo <= 0n) {
    throw new Error(`settleCallPayment: amountKobo must be positive`);
  }
  const feeKobo = BigInt(computePlatformFee(Number(input.amountKobo), input.feeBps));
  const netKobo = input.amountKobo - feeKobo;

  const [payeeAccount, platformRevenue, pendingPool] = await Promise.all([
    accountFor.user(input.payeeUserId),
    accountFor.system('platform_revenue'),
    accountFor.system('pending_debits_pool'),
  ]);

  const result = await postJournal(
    {
      kind: 'call_settlement',
      idempotencyKey: `call:${input.callId}:settle`,
      lines: [
        { accountId: payeeAccount.id, signedAmountKobo: Number(netKobo) },
        ...(feeKobo > 0n
          ? [{ accountId: platformRevenue.id, signedAmountKobo: Number(feeKobo) }]
          : []),
        { accountId: pendingPool.id, signedAmountKobo: -Number(input.amountKobo) },
      ],
      relatedCallId: input.callId,
      relatedUserId: input.payeeUserId,
      memo: `Settled call=${input.callId} (gross ${input.amountKobo} → payee ${netKobo}, fee ${feeKobo})`,
    },
    runner,
  );

  if (!result.alreadyPosted) {
    await insertEvent(runner, {
      aggregateType: OutboxAggregateType.CALL,
      aggregateId: input.callId,
      eventType: OutboxEventType.CALL_SETTLED,
      payload: {
        call_id: input.callId,
        payee_user_id: input.payeeUserId,
        amount_kobo: input.amountKobo.toString(),
        net_kobo: netKobo.toString(),
        fee_kobo: feeKobo.toString(),
        journal_id: result.journalId,
      },
    });
    logger.info(
      {
        callId: input.callId,
        payeeUserId: input.payeeUserId,
        amountKobo: input.amountKobo.toString(),
        netKobo: netKobo.toString(),
        feeKobo: feeKobo.toString(),
      },
      'call payment settled',
    );
  }

  return {
    journalId: result.journalId,
    alreadyPosted: result.alreadyPosted,
    payeeNetKobo: netKobo,
    platformFeeKobo: feeKobo,
  };
};
