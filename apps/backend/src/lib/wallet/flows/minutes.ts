import type { PoolClient } from 'pg';

import { logger } from '@lib/logger.js';

import { accountFor } from '../accounts.js';
import { readUserAvailableBalance } from '../balance.js';
import { postJournal } from '../journal.js';

interface QueryRunner {
  query: PoolClient['query'];
}

export interface BuyMinutesInput {
  userId: string;
  // Stable id for this purchase (mp_<ulid>) — the journal idempotency anchor.
  purchaseId: string;
  amountKobo: bigint;
}

export interface BuyMinutesSuccess {
  status: 'purchased';
  journalId: string;
  alreadyPosted: boolean;
}

export interface BuyMinutesInsufficient {
  status: 'insufficient_balance';
  shortByKobo: bigint;
  currentBalanceKobo: bigint;
}

export type BuyMinutesResult = BuyMinutesSuccess | BuyMinutesInsufficient;

// Moves wallet money into the minutes-escrow liability when a user buys minutes
// against a professional. The pro is NOT paid here — settlement happens per
// minute as the call burns them (Phase 4). On insufficient wallet balance,
// returns `insufficient_balance` WITHOUT throwing or posting.
//
// Journal (minutes_purchase):
//   minutes_escrow:  +amount
//   user_wallet:     -amount
//
// Idempotent on `minutes:<purchaseId>:buy`.
export const buyMinutes = async (
  runner: QueryRunner,
  input: BuyMinutesInput,
): Promise<BuyMinutesResult> => {
  if (input.amountKobo <= 0n) {
    throw new Error(`buyMinutes: amountKobo must be positive, got ${input.amountKobo}`);
  }

  const balance = await readUserAvailableBalance(input.userId);
  if (balance < input.amountKobo) {
    return {
      status: 'insufficient_balance',
      shortByKobo: input.amountKobo - balance,
      currentBalanceKobo: balance,
    };
  }

  const [userAccount, escrow] = await Promise.all([
    accountFor.user(input.userId),
    accountFor.system('minutes_escrow'),
  ]);

  const result = await postJournal(
    {
      kind: 'minutes_purchase',
      idempotencyKey: `minutes:${input.purchaseId}:buy`,
      lines: [
        { accountId: escrow.id, signedAmountKobo: Number(input.amountKobo) },
        { accountId: userAccount.id, signedAmountKobo: -Number(input.amountKobo) },
      ],
      relatedUserId: input.userId,
      memo: `Bought minutes purchase=${input.purchaseId} amount=${input.amountKobo}`,
    },
    runner,
  );

  if (!result.alreadyPosted) {
    logger.info(
      {
        userId: input.userId,
        purchaseId: input.purchaseId,
        amountKobo: input.amountKobo.toString(),
        journalId: result.journalId,
      },
      'minutes purchased (escrow credited)',
    );
  }

  return {
    status: 'purchased',
    journalId: result.journalId,
    alreadyPosted: result.alreadyPosted,
  };
};
