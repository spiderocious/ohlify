import type { PoolClient } from 'pg';

import { pool } from '@lib/db/pool.js';

export interface KycSubmissionAdminRow {
  id: string;
  user_id: string;
  identity_type: string;
  identity_number: string;
  document_upload_id: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  reject_reason_code: string | null;
  reject_note: string | null;
  created_at: Date;
}

export interface ListKycQuery {
  limit: number;
  cursor?: { last_id: string; last_sort_key: string } | undefined;
  status?: string | undefined;
}

export const list = async (q: ListKycQuery): Promise<KycSubmissionAdminRow[]> => {
  const params: unknown[] = [];
  const filters: string[] = [];
  if (q.status) {
    params.push(q.status);
    filters.push(`status = $${params.length}::kyc_status`);
  }
  if (q.cursor) {
    params.push(q.cursor.last_sort_key);
    params.push(q.cursor.last_id);
    filters.push(
      `(created_at < $${params.length - 1}::timestamptz OR (created_at = $${params.length - 1}::timestamptz AND id < $${params.length}))`,
    );
  }
  params.push(q.limit + 1);
  const where = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
  const res = await pool.query<KycSubmissionAdminRow>(
    `SELECT id, user_id, identity_type, identity_number, document_upload_id,
            status::text AS status, reviewed_by, reviewed_at,
            reject_reason_code, reject_note, created_at
       FROM kyc_submissions
       ${where}
       ORDER BY created_at DESC, id DESC
       LIMIT $${params.length}`,
    params,
  );
  return res.rows;
};

export const findByIdForUpdate = async (
  client: PoolClient,
  submissionId: string,
): Promise<KycSubmissionAdminRow | null> => {
  const res = await client.query<KycSubmissionAdminRow>(
    `SELECT id, user_id, identity_type, identity_number, document_upload_id,
            status::text AS status, reviewed_by, reviewed_at,
            reject_reason_code, reject_note, created_at
       FROM kyc_submissions
       WHERE id = $1
       FOR UPDATE`,
    [submissionId],
  );
  return res.rows[0] ?? null;
};

export const setApproved = async (
  client: PoolClient,
  submissionId: string,
  reviewedBy: string | null,
): Promise<void> => {
  await client.query(
    `UPDATE kyc_submissions
       SET status = 'approved'::kyc_status,
           reviewed_by = $2,
           reviewed_at = now(),
           reject_reason_code = NULL,
           reject_note = NULL
       WHERE id = $1`,
    [submissionId, reviewedBy],
  );
};

export const setRejected = async (
  client: PoolClient,
  submissionId: string,
  reviewedBy: string | null,
  reasonCode: string,
  note: string | null,
): Promise<void> => {
  await client.query(
    `UPDATE kyc_submissions
       SET status = 'rejected'::kyc_status,
           reviewed_by = $2,
           reviewed_at = now(),
           reject_reason_code = $3,
           reject_note = $4
       WHERE id = $1`,
    [submissionId, reviewedBy, reasonCode, note],
  );
};
