import type { PoolClient } from 'pg';

import { pool } from '@lib/db/pool.js';
import { id as makeId } from '@lib/ids.js';

import type { StrikeReason, StrikeRow, StrikeStatus } from './strikes.types.js';

interface QueryRunner {
  query: PoolClient['query'];
}

export interface CreateStrikeInput {
  professionalUserId: string;
  relatedCallId: string | null;
  relatedBookingId: string | null;
  reasonCode: StrikeReason;
  description: string | null;
}

// Idempotent on (related_call_id, reason_code) — partial unique index
// rejects double-strikes for the same call + reason. We swallow the
// conflict and return the existing row.
export const create = async (runner: QueryRunner, input: CreateStrikeInput): Promise<StrikeRow> => {
  const inserted = await runner.query<StrikeRow>(
    `INSERT INTO professional_strikes (
       id, professional_user_id, related_call_id, related_booking_id,
       reason_code, description
     )
     VALUES ($1, $2, $3, $4, $5::strike_reason, $6)
     ON CONFLICT (related_call_id, reason_code) WHERE related_call_id IS NOT NULL DO NOTHING
     RETURNING *`,
    [
      makeId('str'),
      input.professionalUserId,
      input.relatedCallId,
      input.relatedBookingId,
      input.reasonCode,
      input.description,
    ],
  );
  if (inserted.rows[0]) return inserted.rows[0];
  // Conflict — re-read.
  const existing = await runner.query<StrikeRow>(
    `SELECT * FROM professional_strikes
      WHERE related_call_id = $1 AND reason_code = $2::strike_reason
      LIMIT 1`,
    [input.relatedCallId, input.reasonCode],
  );
  return existing.rows[0]!;
};

export const findById = async (strikeId: string): Promise<StrikeRow | null> => {
  const res = await pool.query<StrikeRow>(
    `SELECT * FROM professional_strikes WHERE id = $1 LIMIT 1`,
    [strikeId],
  );
  return res.rows[0] ?? null;
};

export const findByIdForUpdate = async (
  runner: QueryRunner,
  strikeId: string,
): Promise<StrikeRow | null> => {
  const res = await runner.query<StrikeRow>(
    `SELECT * FROM professional_strikes WHERE id = $1 LIMIT 1 FOR UPDATE`,
    [strikeId],
  );
  return res.rows[0] ?? null;
};

interface ListInput {
  professionalUserId: string;
  limit: number;
  cursor?: { last_id: string; last_sort_key: string };
  status?: StrikeStatus;
}

export const listForProfessional = async (input: ListInput): Promise<StrikeRow[]> => {
  const params: unknown[] = [input.professionalUserId];
  const filters: string[] = [`professional_user_id = $1`];
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
    `SELECT * FROM professional_strikes
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
  professionalUserId?: string;
  reasonCode?: StrikeReason;
}

export const adminList = async (input: AdminListInput): Promise<StrikeRow[]> => {
  const params: unknown[] = [];
  const filters: string[] = [];
  if (input.professionalUserId) {
    params.push(input.professionalUserId);
    filters.push(`professional_user_id = $${params.length}`);
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
    `SELECT * FROM professional_strikes
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
    `UPDATE professional_strikes
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
    `UPDATE professional_strikes
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
    `UPDATE professional_strikes
        SET status = 'voided',
            reviewed_by_admin_id = $2,
            admin_review_comment = $3,
            reviewed_at = now(),
            updated_at = now()
      WHERE id = $1`,
    [strikeId, adminId, reason],
  );
};

// Count strikes that count toward the ban — active + upheld. Disputed is in
// limbo (doesn't count until resolved); voided is final and doesn't count.
export const countCountingStrikes = async (
  runner: QueryRunner,
  professionalUserId: string,
): Promise<number> => {
  const res = await runner.query<{ n: string }>(
    `SELECT count(*)::text AS n FROM professional_strikes
      WHERE professional_user_id = $1 AND status IN ('active', 'upheld')`,
    [professionalUserId],
  );
  return Number(res.rows[0]?.n ?? '0');
};

export const countTotal = async (professionalUserId: string): Promise<number> => {
  const res = await pool.query<{ n: string }>(
    `SELECT count(*)::text AS n FROM professional_strikes WHERE professional_user_id = $1`,
    [professionalUserId],
  );
  return Number(res.rows[0]?.n ?? '0');
};
