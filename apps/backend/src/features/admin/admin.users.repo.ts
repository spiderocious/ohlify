import type { PoolClient } from 'pg';

import { pool } from '@lib/db/pool.js';

export interface AdminUserRow {
  id: string;
  role: string;
  status: string;
  email: string;
  email_verified_at: Date | null;
  phone_number: string;
  phone_verified_at: Date | null;
  full_name: string | null;
  handle: string | null;
  avatar_url: string | null;
  occupation: string | null;
  description: string | null;
  kyc_status: string;
  kyc_submitted_at: Date | null;
  kyc_reviewed_at: Date | null;
  kyc_reject_reason: string | null;
  last_seen_at: Date | null;
  suspended_until: Date | null;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
  /** List-only aggregates. Absent on findById, which does not compute them. */
  rating?: string | null;
  review_count?: string;
  wallet_kobo?: string;
  calls_total?: string;
  active_strikes?: string;
}

export interface ListUsersQuery {
  limit: number;
  cursor?: { last_id: string; last_sort_key: string } | undefined;
  role?: string | undefined;
  status?: string | undefined;
  q?: string | undefined; // simple substring against email/handle/full_name
  kyc_status?: string | undefined;
}

export const list = async (q: ListUsersQuery): Promise<AdminUserRow[]> => {
  const params: unknown[] = [];
  const filters: string[] = ['u.deleted_at IS NULL'];
  if (q.role) {
    params.push(q.role);
    filters.push(`u.role = $${params.length}::user_role`);
  }
  if (q.status) {
    params.push(q.status);
    filters.push(`u.status = $${params.length}::user_status`);
  }
  if (q.kyc_status) {
    params.push(q.kyc_status);
    filters.push(`u.kyc_status = $${params.length}::kyc_status`);
  }
  if (q.q) {
    params.push(`%${q.q}%`);
    filters.push(
      `(u.email ILIKE $${params.length} OR u.handle ILIKE $${params.length}
         OR u.full_name ILIKE $${params.length} OR u.phone_number ILIKE $${params.length})`,
    );
  }
  if (q.cursor) {
    params.push(q.cursor.last_sort_key);
    params.push(q.cursor.last_id);
    filters.push(
      `(u.created_at < $${params.length - 1}::timestamptz OR (u.created_at = $${params.length - 1}::timestamptz AND u.id < $${params.length}))`,
    );
  }
  params.push(q.limit + 1);
  const where = `WHERE ${filters.join(' AND ')}`;
  const res = await pool.query<AdminUserRow>(
    // The four correlated subqueries are what let the row answer "is
    // something wrong with this account" without a second request per user.
    // Each hits an index on its own user column, and the page is capped at
    // fifty, so this stays a lookup rather than a scan.
    `SELECT u.id, u.role::text AS role, u.status::text AS status, u.email,
            u.email_verified_at, u.phone_number, u.phone_verified_at,
            u.full_name, u.handle, u.avatar_url, u.occupation, u.description,
            u.kyc_status::text AS kyc_status, u.kyc_submitted_at, u.kyc_reviewed_at,
            u.kyc_reject_reason, u.last_seen_at, u.suspended_until, u.deleted_at,
            u.created_at, u.updated_at,
            (SELECT ra.rating::text FROM review_aggregates ra WHERE ra.user_id = u.id)
              AS rating,
            COALESCE((SELECT ra.review_count FROM review_aggregates ra
                       WHERE ra.user_id = u.id), 0)::text AS review_count,
            COALESCE((SELECT ab.balance_kobo FROM account_balances ab
                        JOIN accounts a ON a.id = ab.account_id
                       WHERE a.kind = 'user' AND a.owner_user_id = u.id
                       LIMIT 1), 0)::text AS wallet_kobo,
            (SELECT COUNT(*) FROM instant_calls ic
              WHERE ic.caller_user_id = u.id OR ic.callee_user_id = u.id)::text
              AS calls_total,
            (SELECT COUNT(*) FROM strikes st
              WHERE st.subject_user_id = u.id AND st.status = 'active')::text
              AS active_strikes
       FROM users u
       ${where}
       ORDER BY u.created_at DESC, u.id DESC
       LIMIT $${params.length}`,
    params,
  );
  return res.rows;
};

export const findById = async (userId: string): Promise<AdminUserRow | null> => {
  const res = await pool.query<AdminUserRow>(
    `SELECT id, role::text AS role, status::text AS status, email,
            email_verified_at, phone_number, phone_verified_at,
            full_name, handle, avatar_url, occupation, description,
            kyc_status::text AS kyc_status, kyc_submitted_at, kyc_reviewed_at,
            kyc_reject_reason, last_seen_at, suspended_until, deleted_at,
            created_at, updated_at
       FROM users
       WHERE id = $1`,
    [userId],
  );
  return res.rows[0] ?? null;
};

// Status transitions are gated in the service. Repo just writes.
export const setStatus = async (
  client: PoolClient,
  userId: string,
  status: 'active' | 'suspended' | 'blocked',
  suspendedUntil: Date | null,
): Promise<void> => {
  await client.query(
    `UPDATE users
       SET status = $2::user_status,
           suspended_until = $3,
           updated_at = now()
       WHERE id = $1`,
    [userId, status, suspendedUntil],
  );
};

export const setPasswordHash = async (
  client: PoolClient,
  userId: string,
  passwordHash: string,
): Promise<void> => {
  await client.query(`UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1`, [
    userId,
    passwordHash,
  ]);
};

export interface UserCountsRow {
  all: string;
  active: string;
  suspended: string;
  blocked: string;
}

/**
 * Counts for the status tabs.
 *
 * Unfiltered by the caller's search or role filter: a tab whose count changes
 * as you type is a tab that cannot tell you how many suspended accounts exist,
 * which is the only question it is there to answer.
 */
export const counts = async (): Promise<UserCountsRow> => {
  const res = await pool.query<UserCountsRow>(
    `SELECT COUNT(*)::text AS all,
            COUNT(*) FILTER (WHERE status = 'active')::text AS active,
            COUNT(*) FILTER (WHERE status = 'suspended')::text AS suspended,
            COUNT(*) FILTER (WHERE status = 'blocked')::text AS blocked
       FROM users
      WHERE deleted_at IS NULL`,
  );
  return res.rows[0]!;
};
