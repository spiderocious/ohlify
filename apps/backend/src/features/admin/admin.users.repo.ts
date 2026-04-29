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
  const filters: string[] = ['deleted_at IS NULL'];
  if (q.role) {
    params.push(q.role);
    filters.push(`role = $${params.length}::user_role`);
  }
  if (q.status) {
    params.push(q.status);
    filters.push(`status = $${params.length}::user_status`);
  }
  if (q.kyc_status) {
    params.push(q.kyc_status);
    filters.push(`kyc_status = $${params.length}::kyc_status`);
  }
  if (q.q) {
    params.push(`%${q.q}%`);
    filters.push(
      `(email ILIKE $${params.length} OR handle ILIKE $${params.length} OR full_name ILIKE $${params.length})`,
    );
  }
  if (q.cursor) {
    params.push(q.cursor.last_sort_key);
    params.push(q.cursor.last_id);
    filters.push(
      `(created_at < $${params.length - 1}::timestamptz OR (created_at = $${params.length - 1}::timestamptz AND id < $${params.length}))`,
    );
  }
  params.push(q.limit + 1);
  const where = `WHERE ${filters.join(' AND ')}`;
  const res = await pool.query<AdminUserRow>(
    `SELECT id, role::text AS role, status::text AS status, email,
            email_verified_at, phone_number, phone_verified_at,
            full_name, handle, avatar_url, occupation, description,
            kyc_status::text AS kyc_status, kyc_submitted_at, kyc_reviewed_at,
            kyc_reject_reason, last_seen_at, suspended_until, deleted_at,
            created_at, updated_at
       FROM users
       ${where}
       ORDER BY created_at DESC, id DESC
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
