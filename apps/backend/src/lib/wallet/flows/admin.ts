import type { PoolClient } from 'pg';

import { newRawId } from '@lib/ids.js';
import { logger } from '@lib/logger.js';

import type { JournalLineInput } from '../accounting.js';
import { accountFor } from '../accounts.js';
import { postJournal } from '../journal.js';

interface QueryRunner {
  query: PoolClient['query'];
}

// Admin escape hatch — post any balanced journal with a custom set of lines.
// Caller (admin endpoint) must enforce the audit_log + permission checks.
// The trigger system enforces sum-to-zero AND append-only at the DB layer.
export interface ManualJournalInput {
  adminId: string;
  note: string;
  lines: JournalLineInput[];
  relatedUserId?: string;
  relatedCallId?: string;
  // Optional client-supplied idempotency suffix; when omitted, a fresh ULID
  // is generated so re-clicks don't collide. Provide your own when retrying.
  idempotencyKey?: string;
}

export const postManualJournal = async (
  input: ManualJournalInput,
  runner?: QueryRunner,
): Promise<{ journalId: string; alreadyPosted: boolean }> => {
  const idem = input.idempotencyKey ?? newRawId();
  const result = await postJournal(
    {
      kind: 'admin_manual',
      idempotencyKey: `manual:${input.adminId}:${idem}`,
      lines: input.lines,
      memo: input.note,
      createdByAdminId: input.adminId,
      ...(input.relatedUserId !== undefined ? { relatedUserId: input.relatedUserId } : {}),
      ...(input.relatedCallId !== undefined ? { relatedCallId: input.relatedCallId } : {}),
    },
    runner,
  );
  logger.info(
    {
      adminId: input.adminId,
      idempotencyKey: idem,
      journalId: result.journalId,
      alreadyPosted: result.alreadyPosted,
    },
    'admin_manual journal posted',
  );
  return result;
};

// Convenience: credit a user wallet from platform_promo (gift / promo).
//
// Journal:
//   user_wallet(user): +amount
//   platform_promo:    -amount
export interface AdminCreditInput {
  adminId: string;
  userId: string;
  amountKobo: bigint;
  reason: string;
  idempotencyKey?: string;
}

export const adminCreditUser = async (
  input: AdminCreditInput,
  runner?: QueryRunner,
): Promise<{ journalId: string; alreadyPosted: boolean }> => {
  if (input.amountKobo <= 0n) throw new Error('adminCreditUser: amount must be positive');
  const idem = input.idempotencyKey ?? newRawId();
  const [userAcct, promo] = await Promise.all([
    accountFor.user(input.userId),
    accountFor.system('platform_promo'),
  ]);
  const result = await postJournal(
    {
      kind: 'admin_credit',
      idempotencyKey: `admin_credit:${idem}`,
      lines: [
        { accountId: userAcct.id, signedAmountKobo: Number(input.amountKobo) },
        { accountId: promo.id, signedAmountKobo: -Number(input.amountKobo) },
      ],
      relatedUserId: input.userId,
      memo: input.reason,
      createdByAdminId: input.adminId,
    },
    runner,
  );
  logger.info(
    {
      adminId: input.adminId,
      userId: input.userId,
      amountKobo: input.amountKobo.toString(),
      reason: input.reason,
      journalId: result.journalId,
    },
    'admin_credit posted',
  );
  return result;
};

// Convenience: debit a user wallet to the suspense account (typically used to
// claw back accidental over-credits). Money does NOT leave the platform —
// it's parked in suspense until admin reconciles.
//
// Journal:
//   suspense:          +amount
//   user_wallet(user): -amount
export interface AdminDebitInput {
  adminId: string;
  userId: string;
  amountKobo: bigint;
  reason: string;
  idempotencyKey?: string;
}

export const adminDebitUser = async (
  input: AdminDebitInput,
  runner?: QueryRunner,
): Promise<{ journalId: string; alreadyPosted: boolean }> => {
  if (input.amountKobo <= 0n) throw new Error('adminDebitUser: amount must be positive');
  const idem = input.idempotencyKey ?? newRawId();
  const [userAcct, suspense] = await Promise.all([
    accountFor.user(input.userId),
    accountFor.system('suspense'),
  ]);
  const result = await postJournal(
    {
      kind: 'admin_debit',
      idempotencyKey: `admin_debit:${idem}`,
      lines: [
        { accountId: suspense.id, signedAmountKobo: Number(input.amountKobo) },
        { accountId: userAcct.id, signedAmountKobo: -Number(input.amountKobo) },
      ],
      relatedUserId: input.userId,
      memo: input.reason,
      createdByAdminId: input.adminId,
    },
    runner,
  );
  logger.info(
    {
      adminId: input.adminId,
      userId: input.userId,
      amountKobo: input.amountKobo.toString(),
      reason: input.reason,
      journalId: result.journalId,
    },
    'admin_debit posted',
  );
  return result;
};
