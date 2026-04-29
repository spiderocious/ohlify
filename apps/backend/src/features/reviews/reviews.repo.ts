import type { PoolClient } from 'pg';

import { pool } from '@lib/db/pool.js';
import { id as makeId } from '@lib/ids.js';

import type { ReviewRow } from './reviews.types.js';

interface QueryRunner {
  query: PoolClient['query'];
}

export interface CreateReviewInput {
  callId: string;
  reviewerUserId: string;
  subjectUserId: string;
  rating: number;
  feedbackText: string | null;
  isPublic: boolean;
}

export const create = async (runner: QueryRunner, input: CreateReviewInput): Promise<ReviewRow> => {
  const res = await runner.query<ReviewRow>(
    `INSERT INTO reviews (
       id, call_id, reviewer_user_id, subject_user_id,
       rating, feedback_text, is_public
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      makeId('rv'),
      input.callId,
      input.reviewerUserId,
      input.subjectUserId,
      input.rating,
      input.feedbackText,
      input.isPublic,
    ],
  );
  return res.rows[0]!;
};

export const findById = async (reviewId: string): Promise<ReviewRow | null> => {
  const res = await pool.query<ReviewRow>(`SELECT * FROM reviews WHERE id = $1 LIMIT 1`, [
    reviewId,
  ]);
  return res.rows[0] ?? null;
};

export const findByIdForUpdate = async (
  runner: QueryRunner,
  reviewId: string,
): Promise<ReviewRow | null> => {
  const res = await runner.query<ReviewRow>(
    `SELECT * FROM reviews WHERE id = $1 LIMIT 1 FOR UPDATE`,
    [reviewId],
  );
  return res.rows[0] ?? null;
};

export const findByCallId = async (callId: string): Promise<ReviewRow | null> => {
  const res = await pool.query<ReviewRow>(`SELECT * FROM reviews WHERE call_id = $1 LIMIT 1`, [
    callId,
  ]);
  return res.rows[0] ?? null;
};

interface ListPublicForSubjectInput {
  subjectUserId: string;
  limit: number;
  cursor?: { last_id: string; last_sort_key: string };
  ratingMin?: number;
  ratingMax?: number;
}

// Public reviews for a pro — joined with users for reviewer display info.
export interface ListReviewsRow extends ReviewRow {
  reviewer_name: string | null;
  reviewer_avatar_url: string | null;
}

export const listPublicForSubject = async (
  input: ListPublicForSubjectInput,
): Promise<ListReviewsRow[]> => {
  const params: unknown[] = [input.subjectUserId];
  const filters: string[] = [`r.subject_user_id = $1`, `r.is_public = TRUE`];
  if (input.ratingMin !== undefined) {
    params.push(input.ratingMin);
    filters.push(`r.rating >= $${params.length}`);
  }
  if (input.ratingMax !== undefined) {
    params.push(input.ratingMax);
    filters.push(`r.rating <= $${params.length}`);
  }
  if (input.cursor !== undefined) {
    params.push(input.cursor.last_sort_key);
    params.push(input.cursor.last_id);
    filters.push(
      `(r.created_at < $${params.length - 1}::timestamptz OR (r.created_at = $${params.length - 1}::timestamptz AND r.id < $${params.length}))`,
    );
  }
  params.push(input.limit + 1);
  const res = await pool.query<ListReviewsRow>(
    `SELECT r.*, u.full_name AS reviewer_name, u.avatar_url AS reviewer_avatar_url
       FROM reviews r
       JOIN users u ON u.id = r.reviewer_user_id
      WHERE ${filters.join(' AND ')}
      ORDER BY r.created_at DESC, r.id DESC
      LIMIT $${params.length}`,
    params,
  );
  return res.rows;
};

interface ListGivenInput {
  reviewerUserId: string;
  limit: number;
  cursor?: { last_id: string; last_sort_key: string };
}

export const listGiven = async (input: ListGivenInput): Promise<ListReviewsRow[]> => {
  const params: unknown[] = [input.reviewerUserId];
  const filters: string[] = [`r.reviewer_user_id = $1`];
  if (input.cursor !== undefined) {
    params.push(input.cursor.last_sort_key);
    params.push(input.cursor.last_id);
    filters.push(
      `(r.created_at < $${params.length - 1}::timestamptz OR (r.created_at = $${params.length - 1}::timestamptz AND r.id < $${params.length}))`,
    );
  }
  params.push(input.limit + 1);
  const res = await pool.query<ListReviewsRow>(
    `SELECT r.*, u.full_name AS reviewer_name, u.avatar_url AS reviewer_avatar_url
       FROM reviews r
       JOIN users u ON u.id = r.subject_user_id
      WHERE ${filters.join(' AND ')}
      ORDER BY r.created_at DESC, r.id DESC
      LIMIT $${params.length}`,
    params,
  );
  return res.rows;
};

interface AdminListInput {
  limit: number;
  cursor?: { last_id: string; last_sort_key: string };
  ratingMax?: number;
  professionalId?: string;
  reviewerId?: string;
  onlyHidden?: boolean;
}

export const adminList = async (input: AdminListInput): Promise<ListReviewsRow[]> => {
  const params: unknown[] = [];
  const filters: string[] = [];
  if (input.ratingMax !== undefined) {
    params.push(input.ratingMax);
    filters.push(`r.rating <= $${params.length}`);
  }
  if (input.professionalId) {
    params.push(input.professionalId);
    filters.push(`r.subject_user_id = $${params.length}`);
  }
  if (input.reviewerId) {
    params.push(input.reviewerId);
    filters.push(`r.reviewer_user_id = $${params.length}`);
  }
  if (input.onlyHidden === true) {
    filters.push(`r.is_public = FALSE`);
  }
  if (input.cursor !== undefined) {
    params.push(input.cursor.last_sort_key);
    params.push(input.cursor.last_id);
    filters.push(
      `(r.created_at < $${params.length - 1}::timestamptz OR (r.created_at = $${params.length - 1}::timestamptz AND r.id < $${params.length}))`,
    );
  }
  params.push(input.limit + 1);
  const where = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
  const res = await pool.query<ListReviewsRow>(
    `SELECT r.*, u.full_name AS reviewer_name, u.avatar_url AS reviewer_avatar_url
       FROM reviews r
       JOIN users u ON u.id = r.reviewer_user_id
       ${where}
       ORDER BY r.created_at DESC, r.id DESC
       LIMIT $${params.length}`,
    params,
  );
  return res.rows;
};

export const setHidden = async (
  runner: QueryRunner,
  reviewId: string,
  adminId: string,
  reason: string,
): Promise<void> => {
  await runner.query(
    `UPDATE reviews
        SET is_public = FALSE,
            hidden_at = now(),
            hidden_by_admin_id = $2,
            hide_reason = $3,
            updated_at = now()
      WHERE id = $1`,
    [reviewId, adminId, reason],
  );
};
