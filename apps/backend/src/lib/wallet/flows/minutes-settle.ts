import type { PoolClient } from 'pg';

import { logger } from '@lib/logger.js';

import { computePlatformFee } from '../accounting.js';
import { accountFor } from '../accounts.js';
import { postJournal } from '../journal.js';

interface QueryRunner {
  query: PoolClient['query'];
}

export interface SettleMinutesInput {
  // Instant-call id — the settlement idempotency anchor.
  callId: string;
  payeeUserId: string;
  // Amount consumed from escrow for the minutes actually talked (kobo).
  amountKobo: bigint;
  feeBps: number;
}

export interface SettleMinutesResult {
  journalId: string;
  alreadyPosted: boolean;
  payeeNetKobo: bigint;
  platformFeeKobo: bigint;
}

// Settles consumed minutes from the escrow to the professional at call end.
// Splits the consumed amount between the payee (pro) and platform_revenue,
// releasing that slice from minutes_escrow.
//
// Journal (minutes_settlement):
//   payee_wallet:     +(amount - fee)
//   platform_revenue: +fee
//   minutes_escrow:   -amount
//
// Idempotent on `minutes_call:<callId>:settle`.
export const settleMinutes = async (
  runner: QueryRunner,
  input: SettleMinutesInput,
): Promise<SettleMinutesResult> => {
  if (input.amountKobo <= 0n) {
    throw new Error('settleMinutes: amountKobo must be positive');
  }
  const feeKobo = BigInt(computePlatformFee(Number(input.amountKobo), input.feeBps));
  const netKobo = input.amountKobo - feeKobo;

  const [payeeAccount, platformRevenue, escrow] = await Promise.all([
    accountFor.user(input.payeeUserId),
    accountFor.system('platform_revenue'),
    accountFor.system('minutes_escrow'),
  ]);

  const result = await postJournal(
    {
      kind: 'minutes_settlement',
      idempotencyKey: `minutes_call:${input.callId}:settle`,
      lines: [
        { accountId: payeeAccount.id, signedAmountKobo: Number(netKobo) },
        ...(feeKobo > 0n
          ? [{ accountId: platformRevenue.id, signedAmountKobo: Number(feeKobo) }]
          : []),
        { accountId: escrow.id, signedAmountKobo: -Number(input.amountKobo) },
      ],
      relatedUserId: input.payeeUserId,
      memo: `Settled instant call=${input.callId} (gross ${input.amountKobo} → payee ${netKobo}, fee ${feeKobo})`,
    },
    runner,
  );

  if (!result.alreadyPosted) {
    logger.info(
      {
        callId: input.callId,
        payeeUserId: input.payeeUserId,
        amountKobo: input.amountKobo.toString(),
        netKobo: netKobo.toString(),
        feeKobo: feeKobo.toString(),
      },
      'instant-call minutes settled',
    );
  }

  return {
    journalId: result.journalId,
    alreadyPosted: result.alreadyPosted,
    payeeNetKobo: netKobo,
    platformFeeKobo: feeKobo,
  };
};
