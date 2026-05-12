import type { PoolClient } from 'pg';

import { logger } from '@lib/logger.js';
import { insertEvent, OutboxAggregateType, OutboxEventType } from '@lib/outbox/index.js';

import { accountFor } from '../accounts.js';
import { postJournal } from '../journal.js';

interface QueryRunner {
  query: PoolClient['query'];
}

// ── Journal posters for the three withdrawal phases ─────────────────────────
//
// We don't expose initiation/finalization end-to-end here — that's the wallet
// service's job (it owns the withdrawals row + Paystack call). These helpers
// just post the right journal at each phase, with idempotency keys derived
// from the withdrawal id.

export interface PostRequestedJournalInput {
  withdrawalId: string;
  userId: string;
  amountKobo: bigint;
}

// withdrawal_requested: parks the user's money on paystack_payouts (liability)
// and debits the user wallet.
//
//   paystack_payouts:  +amount
//   user_wallet(user): -amount
export const postWithdrawalRequestedJournal = async (
  runner: QueryRunner,
  input: PostRequestedJournalInput,
): Promise<{ journalId: string; alreadyPosted: boolean }> => {
  const [userAcct, paystackPayouts] = await Promise.all([
    accountFor.user(input.userId),
    accountFor.system('paystack_payouts'),
  ]);
  const result = await postJournal(
    {
      kind: 'withdrawal_requested',
      idempotencyKey: `wd:${input.withdrawalId}:requested`,
      lines: [
        { accountId: paystackPayouts.id, signedAmountKobo: Number(input.amountKobo) },
        { accountId: userAcct.id, signedAmountKobo: -Number(input.amountKobo) },
      ],
      relatedWithdrawalId: input.withdrawalId,
      relatedUserId: input.userId,
      memo: `Withdrawal requested ${input.withdrawalId}`,
    },
    runner,
  );
  if (!result.alreadyPosted) {
    await insertEvent(runner, {
      aggregateType: OutboxAggregateType.WITHDRAWAL,
      aggregateId: input.withdrawalId,
      eventType: OutboxEventType.WITHDRAWAL_REQUESTED,
      payload: {
        withdrawal_id: input.withdrawalId,
        user_id: input.userId,
        amount_kobo: input.amountKobo.toString(),
      },
    });
    logger.info(
      {
        withdrawalId: input.withdrawalId,
        userId: input.userId,
        amountKobo: input.amountKobo.toString(),
      },
      'withdrawal_requested journal posted',
    );
  }
  return result;
};

// withdrawal_completed: the money actually left Paystack on its way to the
// user's bank. Clears the payout liability and recognizes the outflow on the
// contra-asset clearing account.
//
//   paystack_payouts:  -amount   (liability cleared — we no longer owe Paystack)
//   paystack_clearing: +amount   (outflow — clearing is a contra-asset that
//                                 goes negative on funding inflows; an outflow
//                                 walks it back toward zero)
//
// Net across requested+completed:
//   user_wallet:        -amount  (parked at request, stays parked)
//   paystack_clearing:  +amount  (the platform's claim on Paystack drops)
//   paystack_payouts:   net 0    (transit account)
// — i.e. the user's money truly left the platform.
export const postWithdrawalCompletedJournal = async (
  runner: QueryRunner,
  input: PostRequestedJournalInput,
): Promise<{ journalId: string; alreadyPosted: boolean }> => {
  const [paystackPayouts, paystackClearing] = await Promise.all([
    accountFor.system('paystack_payouts'),
    accountFor.system('paystack_clearing'),
  ]);
  const result = await postJournal(
    {
      kind: 'withdrawal_completed',
      idempotencyKey: `wd:${input.withdrawalId}:completed`,
      lines: [
        { accountId: paystackPayouts.id, signedAmountKobo: -Number(input.amountKobo) },
        { accountId: paystackClearing.id, signedAmountKobo: Number(input.amountKobo) },
      ],
      relatedWithdrawalId: input.withdrawalId,
      relatedUserId: input.userId,
      memo: `Withdrawal completed ${input.withdrawalId}`,
    },
    runner,
  );
  if (!result.alreadyPosted) {
    await insertEvent(runner, {
      aggregateType: OutboxAggregateType.WITHDRAWAL,
      aggregateId: input.withdrawalId,
      eventType: OutboxEventType.WITHDRAWAL_COMPLETED,
      payload: {
        withdrawal_id: input.withdrawalId,
        user_id: input.userId,
        amount_kobo: input.amountKobo.toString(),
      },
    });
    logger.info({ withdrawalId: input.withdrawalId }, 'withdrawal_completed journal posted');
  }
  return result;
};

// withdrawal_reversed: Paystack reported the transfer failed. Money never
// left clearing — return it to the user wallet and clear the liability.
//
//   user_wallet(user): +amount
//   paystack_payouts:  -amount
export const postWithdrawalReversedJournal = async (
  runner: QueryRunner,
  input: PostRequestedJournalInput,
): Promise<{ journalId: string; alreadyPosted: boolean }> => {
  const [userAcct, paystackPayouts] = await Promise.all([
    accountFor.user(input.userId),
    accountFor.system('paystack_payouts'),
  ]);
  const result = await postJournal(
    {
      kind: 'withdrawal_reversed',
      idempotencyKey: `wd:${input.withdrawalId}:reversed`,
      lines: [
        { accountId: userAcct.id, signedAmountKobo: Number(input.amountKobo) },
        { accountId: paystackPayouts.id, signedAmountKobo: -Number(input.amountKobo) },
      ],
      relatedWithdrawalId: input.withdrawalId,
      relatedUserId: input.userId,
      memo: `Withdrawal reversed ${input.withdrawalId}`,
    },
    runner,
  );
  if (!result.alreadyPosted) {
    await insertEvent(runner, {
      aggregateType: OutboxAggregateType.WITHDRAWAL,
      aggregateId: input.withdrawalId,
      eventType: OutboxEventType.WITHDRAWAL_REVERSED,
      payload: {
        withdrawal_id: input.withdrawalId,
        user_id: input.userId,
        amount_kobo: input.amountKobo.toString(),
      },
    });
    logger.info({ withdrawalId: input.withdrawalId }, 'withdrawal_reversed journal posted');
  }
  return result;
};
