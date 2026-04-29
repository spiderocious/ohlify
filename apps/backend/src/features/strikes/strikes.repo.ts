import type { PoolClient } from 'pg';

import { pool } from '@lib/db/pool.js';
import { id as makeId } from '@lib/ids.js';

import type { StrikeReason, StrikeRow, StrikeStatus, SubjectRole } from './strikes.types.js';

interface QueryRunner {
  query: PoolClient['query'];
}

export interface CreateStrikeInput {
  subjectUserId: string;
  subjectRole: SubjectRole;
  relatedCallId: string | null;
  relatedBookingId: string | null;
  reasonCode: StrikeReason;
  description: string | null;
}

// Idempotent on (related_call_id, reason_code, subject_role) — partial unique
// index rejects double-strikes for the same call + reason + role. We swallow
// the conflict and return the existing row.
export const create = async (runner: QueryRunner, input: CreateStrikeInput): Promise<StrikeRow> => {
  const inserted = await runner.query<StrikeRow>(
    `INSERT INTO strikes (
       id, subject_user_id, subject_role, related_call_id, related_booking_id,
       reason_code, description
     )
     VALUES ($1, $2, $3, $4, $5, $6::strike_reason, $7)
     ON CONFLICT (related_call_id, reason_code, subject_role)
       WHERE related_call_id IS NOT NULL
       DO NOTHING
     RETURNING *`,
    [
      makeId('str'),
      input.subjectUserId,
      input.subjectRole,
      input.relatedCallId,
      input.relatedBookingId,
      input.reasonCode,
      input.description,
    ],
  );
  if (inserted.rows[0]) return inserted.rows[0];
  // Conflict — re-read the existing row.
  const existing = await runner.query<StrikeRow>(
    `SELECT * FROM strikes
      WHERE related_call_id = $1
        AND reason_code = $2::strike_reason
        AND subject_role = $3
      LIMIT 1`,
    [input.relatedCallId, input.reasonCode, input.subjectRole],
  );
  return existing.rows[0]!;
};

export const findById = async (strikeId: string): Promise<StrikeRow | null> => {
  const res = await pool.query<StrikeRow>(`SELECT * FROM strikes WHERE id = $1 LIMIT 1`, [
    strikeId,
  ]);
  return res.rows[0] ?? null;
};

export const findByIdForUpdate = async (
  runner: QueryRunner,
  strikeId: string,
): Promise<StrikeRow | null> => {
  const res = await runner.query<StrikeRow>(
    `SELECT * FROM strikes WHERE id = $1 LIMIT 1 FOR UPDATE`,
    [strikeId],
  );
  return res.rows[0] ?? null;
};

interface ListInput {
  subjectUserId: string;
  // When undefined, returns BOTH role's strikes (the user might hold both).
  subjectRole?: SubjectRole;
  limit: number;
  cursor?: { last_id: string; last_sort_key: string };
  status?: StrikeStatus;
}

export const listForSubject = async (input: ListInput): Promise<StrikeRow[]> => {
  const params: unknown[] = [input.subjectUserId];
  const filters: string[] = [`subject_user_id = $1`];
  if (input.subjectRole !== undefined) {
    params.push(input.subjectRole);
    filters.push(`subject_role = $${params.length}`);
  }
  if (input.status !== undefined) {
    params.push(input.status);
    filters.push(`status = $${params.length}::strike_status`);
  }
  if (input.cursor !== undefined) {
    params.push(input.cursor.last_sort_key);
    params.push(input.cursor.last_id);
    filters.push(
      `(created_at < $${params.length - 1}::timestamptz OR (created_at = $${params.length - 1}::timestamptz AND id < $${params.length}))`,
    );
  }
  params.push(input.limit + 1);
  const res = await pool.query<StrikeRow>(
    `SELECT * FROM strikes
       WHERE ${filters.join(' AND ')}
       ORDER BY created_at DESC, id DESC
       LIMIT $${params.length}`,
    params,
  );
  return res.rows;
};

interface AdminListInput {
  limit: number;
  cursor?: { last_id: string; last_sort_key: string };
  status?: StrikeStatus;
  subjectUserId?: string;
  subjectRole?: SubjectRole;
  reasonCode?: StrikeReason;
}

export const adminList = async (input: AdminListInput): Promise<StrikeRow[]> => {
  const params: unknown[] = [];
  const filters: string[] = [];
  if (input.subjectUserId) {
    params.push(input.subjectUserId);
    filters.push(`subject_user_id = $${params.length}`);
  }
  if (input.subjectRole !== undefined) {
    params.push(input.subjectRole);
    filters.push(`subject_role = $${params.length}`);
  }
  if (input.status !== undefined) {
    params.push(input.status);
    filters.push(`status = $${params.length}::strike_status`);
  }
  if (input.reasonCode !== undefined) {
    params.push(input.reasonCode);
    filters.push(`reason_code = $${params.length}::strike_reason`);
  }
  if (input.cursor !== undefined) {
    params.push(input.cursor.last_sort_key);
    params.push(input.cursor.last_id);
    filters.push(
      `(created_at < $${params.length - 1}::timestamptz OR (created_at = $${params.length - 1}::timestamptz AND id < $${params.length}))`,
    );
  }
  params.push(input.limit + 1);
  const where = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
  const res = await pool.query<StrikeRow>(
    `SELECT * FROM strikes
       ${where}
       ORDER BY created_at DESC, id DESC
       LIMIT $${params.length}`,
    params,
  );
  return res.rows;
};

export const setDisputed = async (
  runner: QueryRunner,
  strikeId: string,
  comment: string,
): Promise<void> => {
  await runner.query(
    `UPDATE strikes
        SET status = 'disputed',
            dispute_comment = $2,
            disputed_at = now(),
            updated_at = now()
      WHERE id = $1`,
    [strikeId, comment],
  );
};

export const setUpheld = async (
  runner: QueryRunner,
  strikeId: string,
  adminId: string,
  comment: string | null,
): Promise<void> => {
  await runner.query(
    `UPDATE strikes
        SET status = 'upheld',
            reviewed_by_admin_id = $2,
            admin_review_comment = $3,
            reviewed_at = now(),
            updated_at = now()
      WHERE id = $1`,
    [strikeId, adminId, comment],
  );
};

export const setVoided = async (
  runner: QueryRunner,
  strikeId: string,
  adminId: string,
  reason: string,
): Promise<void> => {
  await runner.query(
    `UPDATE strikes
        SET status = 'voided',
            reviewed_by_admin_id = $2,
            admin_review_comment = $3,
            reviewed_at = now(),
            updated_at = now()
      WHERE id = $1`,
    [strikeId, adminId, reason],
  );
};

// Counts strikes that count toward the ban — active + upheld — scoped to a
// specific subject_role. Disputed is in limbo (doesn't count until resolved);
// voided is final and doesn't count.
export const countCountingStrikes = async (
  runner: QueryRunner,
  subjectUserId: string,
  subjectRole: SubjectRole,
): Promise<number> => {
  const res = await runner.query<{ n: string }>(
    `SELECT count(*)::text AS n FROM strikes
      WHERE subject_user_id = $1
        AND subject_role = $2
        AND status IN ('active', 'upheld')`,
    [subjectUserId, subjectRole],
  );
  return Number(res.rows[0]?.n ?? '0');
};

export const countTotal = async (
  subjectUserId: string,
  subjectRole: SubjectRole,
): Promise<number> => {
  const res = await pool.query<{ n: string }>(
    `SELECT count(*)::text AS n FROM strikes
      WHERE subject_user_id = $1 AND subject_role = $2`,
    [subjectUserId, subjectRole],
  );
  return Number(res.rows[0]?.n ?? '0');
};
