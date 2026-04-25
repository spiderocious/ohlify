import type { UserRow } from '@features/auth/auth.types.js';
import { pool } from '@lib/db/pool.js';

import type { BankAccountRow, NotificationPreferencesRow } from './profile.types.js';

// ── Users ─────────────────────────────────────────────────────────────────────

export const findUserById = async (userId: string): Promise<UserRow | null> => {
  const res = await pool.query<UserRow>('SELECT * FROM users WHERE id = $1 LIMIT 1', [userId]);
  return res.rows[0] ?? null;
};

export const findUserByEmail = async (email: string): Promise<UserRow | null> => {
  const res = await pool.query<UserRow>('SELECT * FROM users WHERE email = $1 LIMIT 1', [email]);
  return res.rows[0] ?? null;
};

export const findUserByPhone = async (phone: string): Promise<UserRow | null> => {
  const res = await pool.query<UserRow>('SELECT * FROM users WHERE phone_number = $1 LIMIT 1', [
    phone,
  ]);
  return res.rows[0] ?? null;
};

export const updateUserFields = async (
  userId: string,
  fields: Record<string, unknown>,
): Promise<UserRow | null> => {
  const entries = Object.entries(fields);
  if (entries.length === 0) {
    const res = await pool.query<UserRow>('SELECT * FROM users WHERE id = $1', [userId]);
    return res.rows[0] ?? null;
  }
  const setClauses = entries.map(([k], i) => `${k} = $${i + 2}`).join(', ');
  const values = entries.map(([, v]) => v);
  const res = await pool.query<UserRow>(
    `UPDATE users SET ${setClauses}, updated_at = now() WHERE id = $1 RETURNING *`,
    [userId, ...values],
  );
  return res.rows[0] ?? null;
};

export const softDeleteUser = async (
  userId: string,
  anonymizedEmail: string,
  anonymizedPhone: string,
): Promise<void> => {
  await pool.query(
    `UPDATE users
     SET deleted_at = now(),
         status = 'deleted',
         email = $2,
         phone_number = $3,
         updated_at = now()
     WHERE id = $1`,
    [userId, anonymizedEmail, anonymizedPhone],
  );
};

export const revokeAllUserSessions = async (userId: string): Promise<void> => {
  await pool.query(
    'UPDATE auth_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL',
    [userId],
  );
};

// ── Notification preferences ─────────────────────────────────────────────────

export const findNotificationPreferences = async (
  userId: string,
): Promise<NotificationPreferencesRow | null> => {
  const res = await pool.query<NotificationPreferencesRow>(
    'SELECT * FROM notification_preferences WHERE user_id = $1 LIMIT 1',
    [userId],
  );
  return res.rows[0] ?? null;
};

export const ensureNotificationPreferences = async (
  userId: string,
): Promise<NotificationPreferencesRow> => {
  const existing = await findNotificationPreferences(userId);
  if (existing) return existing;
  const res = await pool.query<NotificationPreferencesRow>(
    `INSERT INTO notification_preferences (user_id)
     VALUES ($1)
     ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
     RETURNING *`,
    [userId],
  );
  return res.rows[0]!;
};

interface PrefsPatch {
  sms?: boolean | undefined;
  email?: boolean | undefined;
  push?: boolean | undefined;
}

export const updateNotificationPreferences = async (
  userId: string,
  patch: PrefsPatch,
): Promise<NotificationPreferencesRow> => {
  await ensureNotificationPreferences(userId);

  const sets: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (patch.sms !== undefined) {
    sets.push(`sms_enabled = $${i++}`, `sms_updated_at = now()`);
    params.push(patch.sms);
  }
  if (patch.email !== undefined) {
    sets.push(`email_enabled = $${i++}`, `email_updated_at = now()`);
    params.push(patch.email);
  }
  if (patch.push !== undefined) {
    sets.push(`push_enabled = $${i++}`, `push_updated_at = now()`);
    params.push(patch.push);
  }

  if (sets.length === 0) {
    return (await findNotificationPreferences(userId))!;
  }

  params.push(userId);
  const res = await pool.query<NotificationPreferencesRow>(
    `UPDATE notification_preferences SET ${sets.join(', ')} WHERE user_id = $${i} RETURNING *`,
    params,
  );
  return res.rows[0]!;
};

// ── Professional categories ──────────────────────────────────────────────────

export const findInvalidCategoryValues = async (values: string[]): Promise<string[]> => {
  if (values.length === 0) return [];
  const res = await pool.query<{ value: string }>(
    `SELECT value FROM professional_categories WHERE value = ANY($1::text[]) AND is_active = TRUE`,
    [values],
  );
  const known = new Set(res.rows.map((r) => r.value));
  return values.filter((v) => !known.has(v));
};

// ── Bank accounts ────────────────────────────────────────────────────────────

export const findBankAccount = async (userId: string): Promise<BankAccountRow | null> => {
  const res = await pool.query<BankAccountRow>(
    'SELECT * FROM bank_accounts WHERE user_id = $1 LIMIT 1',
    [userId],
  );
  return res.rows[0] ?? null;
};

export const findBankByCode = async (
  bankCode: string,
): Promise<{ code: string; name: string } | null> => {
  const res = await pool.query<{ code: string; name: string }>(
    'SELECT code, name FROM banks WHERE code = $1 AND is_active = TRUE LIMIT 1',
    [bankCode],
  );
  return res.rows[0] ?? null;
};

export const upsertBankAccount = async (input: {
  userId: string;
  accountNumber: string;
  bankCode: string;
  bankName: string;
  accountName: string;
}): Promise<BankAccountRow> => {
  const res = await pool.query<BankAccountRow>(
    `INSERT INTO bank_accounts (user_id, account_number, bank_code, bank_name, account_name)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id) DO UPDATE
       SET account_number = EXCLUDED.account_number,
           bank_code = EXCLUDED.bank_code,
           bank_name = EXCLUDED.bank_name,
           account_name = EXCLUDED.account_name,
           updated_at = now()
     RETURNING *`,
    [input.userId, input.accountNumber, input.bankCode, input.bankName, input.accountName],
  );
  return res.rows[0]!;
};

export const deleteBankAccount = async (userId: string): Promise<boolean> => {
  const res = await pool.query('DELETE FROM bank_accounts WHERE user_id = $1', [userId]);
  return (res.rowCount ?? 0) > 0;
};

// ── Review aggregates (for /me rating + review_count) ────────────────────────
// review_aggregates table is defined in db-schema.md §3.14 but the migration
// hasn't shipped yet. Read defensively: return zeros if the table is absent.

export const findReviewAggregate = async (
  userId: string,
): Promise<{ rating: number; review_count: number }> => {
  try {
    const res = await pool.query<{ rating: string; review_count: number }>(
      'SELECT rating, review_count FROM review_aggregates WHERE user_id = $1 LIMIT 1',
      [userId],
    );
    const row = res.rows[0];
    if (!row) return { rating: 0, review_count: 0 };
    return { rating: Number(row.rating), review_count: row.review_count };
  } catch {
    // table missing — pre-aggregates phase
    return { rating: 0, review_count: 0 };
  }
};
