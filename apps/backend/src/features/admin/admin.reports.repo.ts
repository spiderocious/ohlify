import type { PoolClient } from 'pg';

import { pool } from '@lib/db/pool.js';

export interface ReportRow {
  id: string;
  reporter_user_id: string;
  target_type: string;
  target_id: string;
  reason_code: string;
  description: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  review_note: string | null;
  created_at: Date;
}

export interface ListReportsQuery {
  limit: number;
  cursor?: { last_id: string; last_sort_key: string } | undefined;
  status?: string | undefined;
  target_type?: string | undefined;
  target_id?: string | undefined;
}

export const list = async (q: ListReportsQuery): Promise<ReportRow[]> => {
  const params: unknown[] = [];
  const filters: string[] = [];
  if (q.status) {
    params.push(q.status);
    filters.push(`status = $${params.length}::report_status`);
  }
  if (q.target_type) {
    params.push(q.target_type);
    filters.push(`target_type = $${params.length}::report_target_type`);
  }
  if (q.target_id) {
    params.push(q.target_id);
    filters.push(`target_id = $${params.length}`);
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
  const res = await pool.query<ReportRow>(
    `SELECT id, reporter_user_id, target_type::text AS target_type, target_id,
            reason_code, description, status::text AS status, reviewed_by,
            reviewed_at, review_note, created_at
       FROM reports
       ${where}
       ORDER BY created_at DESC, id DESC
       LIMIT $${params.length}`,
    params,
  );
  return res.rows;
};

export const findByIdForUpdate = async (
  client: PoolClient,
  reportId: string,
): Promise<ReportRow | null> => {
  const res = await client.query<ReportRow>(
    `SELECT id, reporter_user_id, target_type::text AS target_type, target_id,
            reason_code, description, status::text AS status, reviewed_by,
            reviewed_at, review_note, created_at
       FROM reports
       WHERE id = $1
       FOR UPDATE`,
    [reportId],
  );
  return res.rows[0] ?? null;
};

export const setReviewed = async (
  client: PoolClient,
  reportId: string,
  status: 'resolved' | 'dismissed',
  reviewedBy: string | null,
  note: string | null,
): Promise<void> => {
  await client.query(
    `UPDATE reports
       SET status = $2::report_status,
           reviewed_by = $3,
           reviewed_at = now(),
           review_note = $4
       WHERE id = $1`,
    [reportId, status, reviewedBy, note],
  );
};
