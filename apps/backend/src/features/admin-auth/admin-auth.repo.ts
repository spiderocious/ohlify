import type { PoolClient } from 'pg';

import { pool } from '@lib/db/pool.js';
import { id as makeId } from '@lib/ids.js';

import type { AdminSessionRow, AdminUserRow } from './admin-auth.types.js';

interface QueryRunner {
  query: PoolClient['query'];
}

export const countAdmins = async (): Promise<number> => {
  const res = await pool.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM admin_users WHERE role = 'admin' AND status = 'active'`,
  );
  return Number(res.rows[0]?.n ?? '0');
};

export interface CreateAdminInput {
  email: string;
  passwordHash: string;
  fullName: string | null;
  role: 'admin' | 'support' | 'finance_ops';
}

export const createAdmin = async (input: CreateAdminInput): Promise<AdminUserRow> => {
  // The legacy `roles` TEXT[] column from migration 0008 is unused — the
  // active role lives in the `role` column added by 0053. We let `roles`
  // default to '{}'.
  const res = await pool.query<AdminUserRow>(
    `INSERT INTO admin_users (
       id, email, password_hash, role, full_name, status, totp_enabled
     ) VALUES ($1, $2, $3, $4, $5, 'active', FALSE)
     RETURNING *`,
    [makeId('adm'), input.email, input.passwordHash, input.role, input.fullName],
  );
  return res.rows[0]!;
};

export const findAdminByEmail = async (email: string): Promise<AdminUserRow | null> => {
  const res = await pool.query<AdminUserRow>(`SELECT * FROM admin_users WHERE email = $1 LIMIT 1`, [
    email,
  ]);
  return res.rows[0] ?? null;
};

export const findAdminById = async (id: string): Promise<AdminUserRow | null> => {
  const res = await pool.query<AdminUserRow>(`SELECT * FROM admin_users WHERE id = $1 LIMIT 1`, [
    id,
  ]);
  return res.rows[0] ?? null;
};

export const setLastLogin = async (id: string): Promise<void> => {
  await pool.query(
    `UPDATE admin_users SET last_login_at = now(), updated_at = now() WHERE id = $1`,
    [id],
  );
};

export const setTotpSetup = async (adminId: string, encryptedSecret: string): Promise<void> => {
  // Stores the new secret WITHOUT enabling TOTP yet — the admin must
  // confirm a code first via /totp/confirm.
  await pool.query(
    `UPDATE admin_users
        SET totp_secret_encrypted = $2,
            totp_enabled = FALSE,
            updated_at = now()
      WHERE id = $1`,
    [adminId, encryptedSecret],
  );
};

export const setTotpConfirmed = async (adminId: string): Promise<void> => {
  await pool.query(
    `UPDATE admin_users
        SET totp_enabled = TRUE,
            updated_at = now()
      WHERE id = $1`,
    [adminId],
  );
};

// ── Sessions ────────────────────────────────────────────────────────────────

export interface CreateSessionInput {
  adminUserId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  userAgent: string | null;
  ipAddress: string | null;
}

export const createSession = async (input: CreateSessionInput): Promise<AdminSessionRow> => {
  const res = await pool.query<AdminSessionRow>(
    `INSERT INTO admin_sessions (
       id, admin_user_id, refresh_token_hash, expires_at, user_agent, ip_address
     ) VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      makeId('asn'),
      input.adminUserId,
      input.refreshTokenHash,
      input.expiresAt,
      input.userAgent,
      input.ipAddress,
    ],
  );
  return res.rows[0]!;
};

export const findSessionByRefreshHash = async (hash: string): Promise<AdminSessionRow | null> => {
  const res = await pool.query<AdminSessionRow>(
    `SELECT * FROM admin_sessions WHERE refresh_token_hash = $1 LIMIT 1`,
    [hash],
  );
  return res.rows[0] ?? null;
};

export const revokeSession = async (sessionId: string): Promise<void> => {
  await pool.query(
    `UPDATE admin_sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL`,
    [sessionId],
  );
};

export const touchLastSeen = async (runner: QueryRunner, sessionId: string): Promise<void> => {
  await runner.query(`UPDATE admin_sessions SET last_seen_at = now() WHERE id = $1`, [sessionId]);
};
