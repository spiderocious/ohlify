import * as bookingsRepo from '@features/bookings/bookings.repo.js';
import * as callsRepo from '@features/calls/calls.repo.js';
import { TERMINAL_CALL_STATUSES } from '@features/calls/calls.types.js';
import { pool } from '@lib/db/pool.js';
import { logger } from '@lib/logger.js';
import { insertEvent, OutboxAggregateType, OutboxEventType } from '@lib/outbox/index.js';
import { decodeCursor, encodeCursor, resolveLimit } from '@lib/pagination.js';
import { ServiceError, ServiceSuccess } from '@lib/service-result.js';

import { REVIEW_MESSAGES } from './reviews.messages.js';
import * as repo from './reviews.repo.js';
import type {
  AdminHideReviewDto,
  AdminListReviewsQueryDto,
  ListReviewsQueryDto,
  PostRatingDto,
} from './reviews.schema.js';
import type { ReviewView } from './reviews.types.js';

const toView = (row: repo.ListReviewsRow): ReviewView => ({
  id: row.id,
  call_id: row.call_id,
  rating: row.rating,
  feedback_text: row.feedback_text,
  is_public: row.is_public,
  reviewer: {
    id: row.reviewer_user_id,
    name: row.reviewer_name,
    avatar_url: row.reviewer_avatar_url,
  },
  subject_user_id: row.subject_user_id,
  created_at: row.created_at.toISOString(),
});

// ── POST /calls/:id/rating ───────────────────────────────────────────────────
//
// Caller rates the pro on a completed call. One review per call (UNIQUE on
// call_id). Pro cannot review caller — review attribution is one-direction
// (consumer → provider).
//
// Eligibility:
//   1. Call must be terminal (completed / disconnected_*; not no_show / scheduled)
//   2. Caller must have actually joined (caller_joined_at IS NOT NULL)
//   3. Authenticated user must BE the caller of the call
//   4. No existing review for this call

export const postRating = async (callId: string, dto: PostRatingDto, userId: string) => {
  const call = await callsRepo.findById(callId);
  if (!call) {
    return new ServiceError('call_not_found', REVIEW_MESSAGES.INVALID, 404);
  }
  if (!(TERMINAL_CALL_STATUSES as readonly string[]).includes(call.status)) {
    return new ServiceError('review_not_eligible', REVIEW_MESSAGES.INVALID, 409, {
      call_id: ['Call is not in a terminal state — wait for it to end'],
    });
  }
  if (!call.caller_joined_at) {
    return new ServiceError('review_not_eligible', REVIEW_MESSAGES.INVALID, 409, {
      call_id: ['Cannot review a call you did not join'],
    });
  }
  const booking = await bookingsRepo.findById(call.booking_id);
  if (!booking || booking.caller_user_id !== userId) {
    return new ServiceError('review_not_eligible', REVIEW_MESSAGES.INVALID, 403, {
      call_id: ['Only the caller can review the call'],
    });
  }
  const existing = await repo.findByCallId(callId);
  if (existing) {
    return new ServiceError('review_exists', REVIEW_MESSAGES.CONFLICT, 409);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const review = await repo.create(client, {
      callId,
      reviewerUserId: userId,
      subjectUserId: booking.callee_user_id,
      rating: dto.rating,
      feedbackText: dto.feedback_text ?? null,
      isPublic: dto.is_public ?? true,
    });
    await insertEvent(client, {
      aggregateType: OutboxAggregateType.CALL,
      aggregateId: callId,
      eventType: OutboxEventType.REVIEW_POSTED,
      payload: {
        review_id: review.id,
        call_id: callId,
        reviewer_user_id: userId,
        subject_user_id: booking.callee_user_id,
        rating: dto.rating,
        is_public: review.is_public,
      },
    });
    await client.query('COMMIT');
    logger.info(
      { reviewId: review.id, callId, rating: dto.rating, subject: booking.callee_user_id },
      'review posted',
    );
    return new ServiceSuccess(
      {
        id: review.id,
        call_id: review.call_id,
        rating: review.rating,
        feedback_text: review.feedback_text,
        is_public: review.is_public,
        subject_user_id: review.subject_user_id,
        created_at: review.created_at.toISOString(),
      },
      REVIEW_MESSAGES.CREATED,
    );
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error({ err, callId }, 'postRating tx failed');
    throw err;
  } finally {
    client.release();
  }
};

// ── GET /professionals/:id/reviews (replaces the empty stub) ────────────────

export const listForProfessional = async (professionalId: string, dto: ListReviewsQueryDto) => {
  const limit = resolveLimit(dto.limit);
  let cursor: { last_id: string; last_sort_key: string } | undefined;
  if (dto.cursor !== undefined) {
    try {
      cursor = decodeCursor(dto.cursor);
    } catch {
      return new ServiceError('validation_error', REVIEW_MESSAGES.FOR_PRO_FETCHED, 400, {
        cursor: ['Invalid cursor'],
      });
    }
  }
  const rows = await repo.listPublicForSubject({
    subjectUserId: professionalId,
    limit,
    ...(cursor ? { cursor } : {}),
    ...(dto.rating_min !== undefined ? { ratingMin: dto.rating_min } : {}),
    ...(dto.rating_max !== undefined ? { ratingMax: dto.rating_max } : {}),
  });
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor({ last_id: last.id, last_sort_key: last.created_at.toISOString() })
      : null;
  return new ServiceSuccess(
    {
      items: page.map(toView),
      meta: { next_cursor: nextCursor, has_more: hasMore },
    },
    REVIEW_MESSAGES.FOR_PRO_FETCHED,
  );
};

// ── GET /me/reviews-given ────────────────────────────────────────────────────

export const listGiven = async (dto: ListReviewsQueryDto, userId: string) => {
  const limit = resolveLimit(dto.limit);
  let cursor: { last_id: string; last_sort_key: string } | undefined;
  if (dto.cursor !== undefined) {
    try {
      cursor = decodeCursor(dto.cursor);
    } catch {
      return new ServiceError('validation_error', REVIEW_MESSAGES.GIVEN_FETCHED, 400, {
        cursor: ['Invalid cursor'],
      });
    }
  }
  const rows = await repo.listGiven({
    reviewerUserId: userId,
    limit,
    ...(cursor ? { cursor } : {}),
  });
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor({ last_id: last.id, last_sort_key: last.created_at.toISOString() })
      : null;
  return new ServiceSuccess(
    {
      items: page.map(toView),
      meta: { next_cursor: nextCursor, has_more: hasMore },
    },
    REVIEW_MESSAGES.GIVEN_FETCHED,
  );
};

// ── Admin: list + hide ───────────────────────────────────────────────────────

export const adminListReviews = async (dto: AdminListReviewsQueryDto) => {
  const limit = resolveLimit(dto.limit);
  let cursor: { last_id: string; last_sort_key: string } | undefined;
  if (dto.cursor !== undefined) {
    try {
      cursor = decodeCursor(dto.cursor);
    } catch {
      return new ServiceError('validation_error', REVIEW_MESSAGES.ADMIN_LIST_FETCHED, 400, {
        cursor: ['Invalid cursor'],
      });
    }
  }
  const rows = await repo.adminList({
    limit,
    ...(cursor ? { cursor } : {}),
    ...(dto.rating_max !== undefined ? { ratingMax: dto.rating_max } : {}),
    ...(dto.professional_id ? { professionalId: dto.professional_id } : {}),
    ...(dto.user_id ? { reviewerId: dto.user_id } : {}),
    ...(dto.only_hidden === 'true' ? { onlyHidden: true } : {}),
  });
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor({ last_id: last.id, last_sort_key: last.created_at.toISOString() })
      : null;
  return new ServiceSuccess(
    {
      items: page.map(toView),
      meta: { next_cursor: nextCursor, has_more: hasMore },
    },
    REVIEW_MESSAGES.ADMIN_LIST_FETCHED,
  );
};

export interface AdminHideReviewContext {
  reviewId: string;
  adminId: string;
  dto: AdminHideReviewDto;
}

export const adminHideReview = async (ctx: AdminHideReviewContext) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const review = await repo.findByIdForUpdate(client, ctx.reviewId);
    if (!review) {
      await client.query('ROLLBACK');
      return new ServiceError('review_not_found', REVIEW_MESSAGES.NOT_FOUND, 404);
    }
    if (!review.is_public) {
      await client.query('ROLLBACK');
      return new ServiceError('conflict', REVIEW_MESSAGES.CONFLICT, 409, {
        review_id: ['Review is already hidden'],
      });
    }
    await repo.setHidden(client, review.id, ctx.adminId, ctx.dto.reason);
    await insertEvent(client, {
      aggregateType: OutboxAggregateType.USER,
      aggregateId: review.subject_user_id,
      eventType: OutboxEventType.REVIEW_HIDDEN,
      payload: {
        review_id: review.id,
        subject_user_id: review.subject_user_id,
        admin_id: ctx.adminId,
        reason: ctx.dto.reason,
      },
    });
    await client.query('COMMIT');
    logger.info({ reviewId: review.id, adminId: ctx.adminId }, 'admin hid review');
    const fresh = await repo.findById(review.id);
    return new ServiceSuccess(
      {
        id: fresh!.id,
        is_public: fresh!.is_public,
        hidden_at: fresh!.hidden_at?.toISOString() ?? null,
        hide_reason: fresh!.hide_reason,
      },
      REVIEW_MESSAGES.ADMIN_HIDDEN,
    );
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error({ err, reviewId: ctx.reviewId }, 'adminHideReview tx failed');
    throw err;
  } finally {
    client.release();
  }
};
