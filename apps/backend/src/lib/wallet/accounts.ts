import { pool } from '@lib/db/pool.js';
import { id } from '@lib/ids.js';

// System account codes — must match the seed in migration 0026.
export const SystemAccountCode = {
  PAYSTACK_CLEARING: 'paystack_clearing',
  PAYSTACK_FEES: 'paystack_fees',
  PAYSTACK_PAYOUTS: 'paystack_payouts',
  PLATFORM_REVENUE: 'platform_revenue',
  PLATFORM_PROMO: 'platform_promo',
  SUSPENSE: 'suspense',
  PENDING_DEBITS_POOL: 'pending_debits_pool',
} as const;

export type SystemAccountCode = (typeof SystemAccountCode)[keyof typeof SystemAccountCode];

export interface AccountRow {
  id: string;
  kind: 'user' | 'system' | 'liability';
  owner_user_id: string | null;
  system_code: string | null;
  currency: string;
  label: string;
  is_active: boolean;
}

// Resolves a system account by code. Cached for the process lifetime — system
// accounts are seeded and immutable.
const systemAccountCache = new Map<string, AccountRow>();

const fetchSystemAccount = async (code: SystemAccountCode): Promise<AccountRow> => {
  const cached = systemAccountCache.get(code);
  if (cached) return cached;
  const res = await pool.query<AccountRow>(
    `SELECT * FROM accounts
      WHERE kind IN ('system','liability')
        AND system_code = $1
        AND currency = 'NGN'
      LIMIT 1`,
    [code],
  );
  const row = res.rows[0];
  if (!row) {
    throw new Error(`system account not found: ${code} (migration 0026 seed missing?)`);
  }
  systemAccountCache.set(code, row);
  return row;
};

// Resolves a user's wallet account, creating the row on first access. The
// per-user-per-currency unique index prevents concurrent creates from
// duplicating; the ON CONFLICT DO NOTHING handles the race cleanly.
const fetchUserAccount = async (userId: string): Promise<AccountRow> => {
  const existing = await pool.query<AccountRow>(
    `SELECT * FROM accounts
      WHERE kind = 'user' AND owner_user_id = $1 AND currency = 'NGN'
      LIMIT 1`,
    [userId],
  );
  if (existing.rows[0]) return existing.rows[0];

  const accountId = id('acct');
  const inserted = await pool.query<AccountRow>(
    `INSERT INTO accounts (id, kind, owner_user_id, system_code, currency, label)
     VALUES ($1, 'user', $2, NULL, 'NGN', 'User wallet')
     ON CONFLICT (owner_user_id, currency) WHERE kind = 'user' DO NOTHING
     RETURNING *`,
    [accountId, userId],
  );
  if (inserted.rows[0]) {
    // Also seed a 0 balance row so the AFTER INSERT trigger has somewhere to
    // land. Migration 0029 seeded existing accounts; new user wallets need this.
    await pool.query(
      `INSERT INTO account_balances (account_id, balance_kobo, currency)
       VALUES ($1, 0, 'NGN')
       ON CONFLICT (account_id) DO NOTHING`,
      [inserted.rows[0].id],
    );
    return inserted.rows[0];
  }

  // Lost the insert race; re-read.
  const reread = await pool.query<AccountRow>(
    `SELECT * FROM accounts
      WHERE kind = 'user' AND owner_user_id = $1 AND currency = 'NGN'
      LIMIT 1`,
    [userId],
  );
  if (!reread.rows[0]) {
    throw new Error(`failed to materialize user wallet account for ${userId}`);
  }
  return reread.rows[0];
};

export const accountFor = {
  system: fetchSystemAccount,
  user: fetchUserAccount,
};

// Lookup helpers used by admin endpoints.
export const findAccountById = async (accountId: string): Promise<AccountRow | null> => {
  const res = await pool.query<AccountRow>(`SELECT * FROM accounts WHERE id = $1 LIMIT 1`, [
    accountId,
  ]);
  return res.rows[0] ?? null;
};

export const findUserWalletByUserId = async (userId: string): Promise<AccountRow | null> => {
  const res = await pool.query<AccountRow>(
    `SELECT * FROM accounts
      WHERE kind = 'user' AND owner_user_id = $1 AND currency = 'NGN'
      LIMIT 1`,
    [userId],
  );
  return res.rows[0] ?? null;
};

export const listSystemAccounts = async (): Promise<AccountRow[]> => {
  const res = await pool.query<AccountRow>(
    `SELECT * FROM accounts
      WHERE kind IN ('system','liability')
      ORDER BY system_code ASC`,
  );
  return res.rows;
};
