import type { PoolClient } from 'pg';

import { logger } from '@lib/logger.js';
import { insertEvent, OutboxAggregateType, OutboxEventType } from '@lib/outbox/index.js';

import { accountFor } from '../accounts.js';
import { postJournal } from '../journal.js';

interface QueryRunner {
  query: PoolClient['query'];
}

export interface ApplyFundingInput {
  userId: string;
  paymentId: string;
  // The reference WE issued (ohf_ref_<ulid>) — also the journal idempotency
  // anchor. Replays of the same reference are a no-op.
  reference: string;
  // Amount the user authorized at Paystack (kobo).
  grossKobo: number;
  // Paystack's fee on this transaction (kobo). May be null if not yet known
  // — funding can still post; fee adjustment journal can come later.
  feeKobo: number | null;
}

export interface ApplyFundingResult {
  journalId: string;
  alreadyApplied: boolean;
  netKobo: number;
}

// Posts the wallet_funding journal:
//
//   user_wallet(u):     +net
//   paystack_fees:      +fee
//   paystack_clearing:  -gross
//
// Idempotent on `funding:<reference>`. Inserts an outbox event for the
// downstream side-effects (notification email, push). Must be called inside
// a tx (we expect to run alongside the payments-row update).
export const applyFunding = async (
  runner: QueryRunner,
  input: ApplyFundingInput,
): Promise<ApplyFundingResult> => {
  const fee = input.feeKobo ?? 0;
  const net = input.grossKobo - fee;
  if (net <= 0) {
    throw new Error(
      `applyFunding: net amount must be positive, got gross=${input.grossKobo} fee=${fee}`,
    );
  }

  const [userAccount, paystackFees, paystackClearing] = await Promise.all([
    accountFor.user(input.userId),
    accountFor.system('paystack_fees'),
    accountFor.system('paystack_clearing'),
  ]);

  const lines = [
    { accountId: userAccount.id, signedAmountKobo: net },
    ...(fee > 0 ? [{ accountId: paystackFees.id, signedAmountKobo: fee }] : []),
    { accountId: paystackClearing.id, signedAmountKobo: -input.grossKobo },
  ];

  const result = await postJournal(
    {
      kind: 'wallet_funding',
      idempotencyKey: `funding:${input.reference}`,
      lines,
      relatedPaymentId: input.paymentId,
      relatedUserId: input.userId,
      memo: `Wallet funding ref=${input.reference}`,
    },
    runner,
  );

  if (!result.alreadyPosted) {
    await insertEvent(runner, {
      aggregateType: OutboxAggregateType.PAYMENT,
      aggregateId: input.paymentId,
      eventType: OutboxEventType.WALLET_FUNDING_SUCCEEDED,
      payload: {
        user_id: input.userId,
        payment_id: input.paymentId,
        reference: input.reference,
        gross_kobo: input.grossKobo,
        fee_kobo: fee,
        net_kobo: net,
      },
    });
    logger.info(
      {
        userId: input.userId,
        reference: input.reference,
        grossKobo: input.grossKobo,
        feeKobo: fee,
        netKobo: net,
      },
      'wallet funding applied',
    );
  }

  return {
    journalId: result.journalId,
    alreadyApplied: result.alreadyPosted,
    netKobo: net,
  };
};
