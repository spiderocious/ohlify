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
  selfieUploadKey?: string | undefined;
  status: KycStatus;
}): Promise<KycSubmissionRow> => {
  // Idempotent on (user_id, identity_type, identity_number) — newer overwrites status fields.
  // For MVP we just insert a new submission per call to preserve audit trail.
  const submissionId = id('kyc');
  const res = await pool.query<KycSubmissionRow>(
    `INSERT INTO kyc_submissions
       (id, user_id, identity_type, identity_number, document_upload_id, selfie_upload_key, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      submissionId,
      input.userId,
      input.identityType,
      input.identityNumber,
      input.documentUploadId ?? null,
      input.selfieUploadKey ?? null,
      input.status,
    ],
  );
  return res.rows[0]!;
};

/**
 * Patches just the selfie key on the user's most recent submission. Used when
 * the user submits a selfie independently of resubmitting their identity.
 * Returns true when a row was updated.
 */
export const updateLatestSelfieKey = async (
  userId: string,
  selfieKey: string,
): Promise<boolean> => {
  const res = await pool.query(
    `UPDATE kyc_submissions
        SET selfie_upload_key = $2
      WHERE id = (
        SELECT id FROM kyc_submissions
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 1
      )`,
    [userId, selfieKey],
  );
  return (res.rowCount ?? 0) > 0;
};

/**
 * Atomically transitions the user from "items complete" → either auto-
 * approved or submitted-for-review. Run in a single transaction so the
 * `users` row and the latest `kyc_submissions` row never disagree.
 *
 * What it does:
 *
 *   1. Updates `users`: kyc_status, kyc_submitted_at (always), and
 *      kyc_reviewed_at (only on auto-approval). On auto-approval also
 *      clears kyc_reject_reason — leaving it set on an approved user
 *      makes the admin UI show a leftover "rejected for X" badge.
 *
 *   2. Updates the latest `kyc_submissions` row to match the new
 *      `users.kyc_status`. This is the part that was missing — without
 *      it, auto-approved users carried a `pending_review` (or worse,
 *      `rejected`) submission row indefinitely. The mismatch broke the
 *      customer rejection screen (which reads latest_submission_status)
 *      and confused admin queues.
 *
 * If somehow the user has no submission row yet (shouldn't happen —
 * they had to PATCH KYC to get here for the items to be complete) the
 * submission update is a no-op.
 */
export const completeKycInTx = async (
  userId: string,
  status: KycStatus,
): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const isApproved = status === 'approved';
    const userSets: string[] = ['kyc_status = $1', 'kyc_submitted_at = now()', 'updated_at = now()'];
    const userParams: unknown[] = [status];
    if (isApproved) {
      userSets.push('kyc_reviewed_at = now()');
      userSets.push('kyc_reject_reason = NULL');
    }
    userParams.push(userId);
    await client.query(
      `UPDATE users SET ${userSets.join(', ')} WHERE id = $${userParams.length}`,
      userParams,
    );

    if (isApproved) {
      await client.query(
        `UPDATE kyc_submissions
            SET status = 'approved'::kyc_status,
                reviewed_at = now(),
                reject_reason_code = NULL,
                reject_note = NULL
          WHERE id = (
            SELECT id FROM kyc_submissions
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT 1
          )`,
        [userId],
      );
    } else {
      // Manual-review path: latest row is the freshly-submitted one.
      // Stamp it pending_review and clear any prior reject_* state so a
      // resubmitted row (after a previous rejection on the SAME row —
      // shouldn't happen because PATCH inserts new rows, but defensive)
      // doesn't carry stale rejection notes into the next admin review.
      await client.query(
        `UPDATE kyc_submissions
            SET status = 'pending_review'::kyc_status,
                reviewed_by = NULL,
                reviewed_at = NULL,
                reject_reason_code = NULL,
                reject_note = NULL
          WHERE id = (
            SELECT id FROM kyc_submissions
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT 1
          )`,
        [userId],
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Sets users.avatar_url to the given file-service key, but ONLY when the
 * user currently has no avatar set. Used to bootstrap a public-facing
 * avatar from the user's KYC selfie at submission time so the rest of the
 * product (home, search, admin, reviews, strikes) doesn't render an
 * empty avatar circle for users who never explicitly chose one.
 *
 * Idempotent and safe to call repeatedly. Never overwrites an admin- or
 * user-chosen avatar — a later POST /me/avatar always wins.
 */
export const setAvatarFromSelfieIfNull = async (
  userId: string,
  selfieKey: string,
): Promise<void> => {
  await pool.query(
    `UPDATE users
        SET avatar_url = $2,
            updated_at = now()
      WHERE id = $1
        AND avatar_url IS NULL
        AND deleted_at IS NULL`,
    [userId, selfieKey],
  );
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
