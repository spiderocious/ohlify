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

// Pending = how much money is currently parked in the pending_debits_pool
// against this specific user (across all their open call payments).
//
// Implemented by joining wallet_entries → journal_entries on related_user_id
// and summing only the lines that hit the pending_debits_pool account. A
// reserve adds positive to the pool, a settle/refund subtracts. Net per-user
// is exactly the user's currently-parked pending money.
export const readUserPendingBalance = async (userId: string): Promise<bigint> => {
  const poolAccount = await accountFor.system('pending_debits_pool');
  const res = await pool.query<{ pending: string }>(
    `SELECT COALESCE(SUM(we.signed_amount_kobo), 0)::text AS pending
       FROM wallet_entries we
       JOIN journal_entries je ON je.id = we.journal_id
      WHERE we.account_id = $1
        AND je.related_user_id = $2`,
    [poolAccount.id, userId],
  );
  return BigInt(res.rows[0]?.pending ?? '0');
};
