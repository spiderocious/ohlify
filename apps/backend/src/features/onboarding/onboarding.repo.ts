import type { UserRow } from '@features/auth/auth.types.js';
import { pool } from '@lib/db/pool.js';
import { id } from '@lib/ids.js';

import type {
  HandleRedirectRow,
  IdentityType,
  KycStatus,
  KycSubmissionRow,
} from './onboarding.types.js';

// ── Users ─────────────────────────────────────────────────────────────────────

export const findUserById = async (userId: string): Promise<UserRow | null> => {
  const res = await pool.query<UserRow>('SELECT * FROM users WHERE id = $1 LIMIT 1', [userId]);
  return res.rows[0] ?? null;
};

export const setUserRole = async (
  userId: string,
  role: 'client' | 'professional',
): Promise<void> => {
  await pool.query('UPDATE users SET role = $1, updated_at = now() WHERE id = $2', [role, userId]);
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

export const setKycStatus = async (
  userId: string,
  status: KycStatus,
  submitted: boolean,
  approved: boolean,
): Promise<void> => {
  const sets: string[] = ['kyc_status = $1'];
  const params: unknown[] = [status];
  if (submitted) sets.push('kyc_submitted_at = now()');
  if (approved) sets.push('kyc_reviewed_at = now()');
  sets.push('updated_at = now()');
  params.push(userId);

  await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
};

// ── Handle availability + redirect ────────────────────────────────────────────

export const isHandleTaken = async (handle: string): Promise<boolean> => {
  const lower = handle.toLowerCase();
  const res = await pool.query<{ taken: boolean }>(
    `SELECT EXISTS(
       SELECT 1 FROM users WHERE handle = $1 AND deleted_at IS NULL
       UNION ALL
       SELECT 1 FROM handle_redirects WHERE old_handle = $1 AND expires_at > now()
     ) AS taken`,
    [lower],
  );
  return res.rows[0]?.taken ?? false;
};

export const insertHandleRedirect = async (
  oldHandle: string,
  userId: string,
  expiresAt: Date,
): Promise<void> => {
  await pool.query(
    `INSERT INTO handle_redirects (old_handle, user_id, expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (old_handle) DO UPDATE SET user_id = EXCLUDED.user_id, expires_at = EXCLUDED.expires_at`,
    [oldHandle.toLowerCase(), userId, expiresAt],
  );
};

export const findHandleRedirect = async (handle: string): Promise<HandleRedirectRow | null> => {
  const res = await pool.query<HandleRedirectRow>(
    'SELECT * FROM handle_redirects WHERE old_handle = $1 LIMIT 1',
    [handle.toLowerCase()],
  );
  return res.rows[0] ?? null;
};

// ── KYC submissions ───────────────────────────────────────────────────────────

export const upsertKycSubmission = async (input: {
  userId: string;
  identityType: IdentityType;
  identityNumber: string;
  documentUploadId?: string | undefined;
  status: KycStatus;
}): Promise<KycSubmissionRow> => {
  // Idempotent on (user_id, identity_type, identity_number) — newer overwrites status fields.
  // For MVP we just insert a new submission per call to preserve audit trail.
  const submissionId = id('kyc');
  const res = await pool.query<KycSubmissionRow>(
    `INSERT INTO kyc_submissions
       (id, user_id, identity_type, identity_number, document_upload_id, status)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      submissionId,
      input.userId,
      input.identityType,
      input.identityNumber,
      input.documentUploadId ?? null,
      input.status,
    ],
  );
  return res.rows[0]!;
};

export const findLatestKycSubmission = async (userId: string): Promise<KycSubmissionRow | null> => {
  const res = await pool.query<KycSubmissionRow>(
    `SELECT * FROM kyc_submissions
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId],
  );
  return res.rows[0] ?? null;
};

// ── Bank account presence (counts toward pro KYC, does NOT mutate) ────────────

export const hasBankAccount = async (userId: string): Promise<boolean> => {
  const res = await pool.query<{ exists: boolean }>(
    'SELECT EXISTS(SELECT 1 FROM bank_accounts WHERE user_id = $1) AS exists',
    [userId],
  );
  return res.rows[0]?.exists ?? false;
};

// ── Rates presence (counts toward pro KYC, does NOT mutate) ──────────────────

export const hasAnyActiveRate = async (userId: string): Promise<boolean> => {
  const res = await pool.query<{ exists: boolean }>(
    'SELECT EXISTS(SELECT 1 FROM professional_rates WHERE user_id = $1 AND deleted_at IS NULL) AS exists',
    [userId],
  );
  return res.rows[0]?.exists ?? false;
};
