import { pool } from '@lib/db/pool.js';

import { accountFor } from './accounts.js';

export interface AccountBalance {
  account_id: string;
  balance_kobo: bigint;
  currency: string;
  updated_at: Date;
}

// All balance reads return BIGINT to preserve precision for amounts above
// IEEE-754 safe range. Callers serialize via @lib/money.koboToJson when
// emitting in HTTP responses (returns number when safe, string above 2^53).
export const readBalance = async (accountId: string): Promise<AccountBalance> => {
  const res = await pool.query<{
    account_id: string;
    balance_kobo: string;
    currency: string;
    updated_at: Date;
  }>(
    `SELECT account_id, balance_kobo::text AS balance_kobo, currency, updated_at
       FROM account_balances
      WHERE account_id = $1
      LIMIT 1`,
    [accountId],
  );
  const row = res.rows[0];
  if (!row) {
    return {
      account_id: accountId,
      balance_kobo: 0n,
      currency: 'NGN',
      updated_at: new Date(0),
    };
  }
  return {
    account_id: row.account_id,
    balance_kobo: BigInt(row.balance_kobo),
    currency: row.currency,
    updated_at: row.updated_at,
  };
};

// User-wallet balance = sum of all entries against the user's wallet account.
// Materializes the wallet on first access if missing.
export const readUserAvailableBalance = async (userId: string): Promise<bigint> => {
  const account = await accountFor.user(userId);
  const bal = await readBalance(account.id);
  return bal.balance_kobo;
};

// Pending = how much money the user has currently reserved in the
// pending_debits_pool for in-flight bookings.
//
// We compute this from `bookings` directly — sum of total_paid_kobo over
// bookings where the user is the caller, the booking is `confirmed`, and
// the matching call is not yet in a terminal state. This is the per-user
// view of what the engine has parked on their behalf.
//
// We don't compute it from `wallet_entries` joined on related_user_id
// because settlement journals attribute the offsetting pool decrease to
// the PAYEE (the user receiving the money), not the original payer. So a
// completed call leaves a phantom +amount attributed to the caller until
// further bookings rebalance them. The ledger as a whole is correct
// (sum-to-zero invariant holds; pool's cached balance equals the sum
// across all entries) — only the per-caller attribution is brittle.
//
// Authoritative: bookings.total_paid_kobo is the snapshot of what was
// actually moved into the pool for that booking.
const TERMINAL_CALL_STATUSES = [
  'completed',
  'no_show_caller',
  'no_show_callee',
  'no_show_both',
  'disconnected_caller',
  'disconnected_callee',
];

export const readUserPendingBalance = async (userId: string): Promise<bigint> => {
  const res = await pool.query<{ pending: string }>(
    `SELECT COALESCE(SUM(b.total_paid_kobo), 0)::text AS pending
       FROM bookings b
       JOIN calls c ON c.booking_id = b.id
      WHERE b.caller_user_id = $1
        AND b.status = 'confirmed'
        AND c.status <> ALL($2::call_status[])`,
    [userId, TERMINAL_CALL_STATUSES],
  );
  return BigInt(res.rows[0]?.pending ?? '0');
};
