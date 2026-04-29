import type { PoolClient } from 'pg';

import { platformConfig } from '@lib/config/platform-config.service.js';
import { pool } from '@lib/db/pool.js';
import { logger } from '@lib/logger.js';
import { decodeCursor, encodeCursor, resolveLimit } from '@lib/pagination.js';
import { ServiceError, ServiceSuccess } from '@lib/service-result.js';

import { STRIKE_MESSAGES } from './strikes.messages.js';
import * as repo from './strikes.repo.js';
import type {
  AdminListStrikesQueryDto,
  AdminUpholdStrikeDto,
  AdminVoidStrikeDto,
  DisputeStrikeDto,
  ListStrikesQueryDto,
} from './strikes.schema.js';
import { StrikeReason, StrikeStatus, type StrikeRow, type StrikeView } from './strikes.types.js';

interface QueryRunner {
  query: PoolClient['query'];
}

const STUB_ADMIN_ID = 'adm_stub';

const toView = (row: StrikeRow): StrikeView => ({
  id: row.id,
  professional_user_id: row.professional_user_id,
  related_call_id: row.related_call_id,
  related_booking_id: row.related_booking_id,
  reason_code: row.reason_code,
  description: row.description,
  status: row.status,
  dispute_comment: row.dispute_comment,
  disputed_at: row.disputed_at?.toISOString() ?? null,
  admin_review_comment: row.admin_review_comment,
  reviewed_at: row.reviewed_at?.toISOString() ?? null,
  created_at: row.created_at.toISOString(),
});

// ── Internal: issue a strike + check auto-ban ───────────────────────────────
//
// Called from the calls resolver path (not exposed via HTTP). Caller owns
// the tx. Auto-ban happens inline if the threshold is hit. Both are
// gated by config (each strike trigger is independently toggleable; the
// auto-ban threshold is itself configurable).

export interface IssueStrikeInput {
  professionalUserId: string;
  relatedCallId: string | null;
  relatedBookingId: string | null;
  reasonCode: StrikeReason;
  description: string | null;
}

export const maybeIssueStrike = async (
  runner: QueryRunner,
  input: IssueStrikeInput,
): Promise<{ issued: boolean; banned: boolean; strikeId?: string }> => {
  const cfg = platformConfig.professional();
  const triggerEnabled =
    (input.reasonCode === StrikeReason.NO_SHOW && cfg.strike_on_no_show) ||
    (input.reasonCode === StrikeReason.LATE_CANCEL && cfg.strike_on_late_cancel) ||
    (input.reasonCode === StrikeReason.MID_CALL_QUIT && cfg.strike_on_mid_call_quit);
  if (!triggerEnabled) {
    logger.info(
      { professionalUserId: input.professionalUserId, reason: input.reasonCode },
      'strike trigger disabled in config; skipping',
    );
    return { issued: false, banned: false };
  }

  const strike = await repo.create(runner, input);
  const counting = await repo.countCountingStrikes(runner, input.professionalUserId);
  let banned = false;
  if (counting >= cfg.strikes_before_ban) {
    // Auto-ban: flip user status to suspended. Already-suspended is a no-op.
    await runner.query(
      `UPDATE users
          SET status = 'suspended', updated_at = now()
        WHERE id = $1 AND status = 'active'`,
      [input.professionalUserId],
    );
    banned = true;
    logger.warn(
      {
        professionalUserId: input.professionalUserId,
        countingStrikes: counting,
        threshold: cfg.strikes_before_ban,
      },
      'auto-ban: professional suspended on strike threshold',
    );
  }
  logger.info(
    {
      strikeId: strike.id,
      professionalUserId: input.professionalUserId,
      reason: input.reasonCode,
      countingAfter: counting,
      banned,
    },
    'strike issued',
  );
  return { issued: true, banned, strikeId: strike.id };
};

// ── GET /me/strikes ─────────────────────────────────────────────────────────

export const listMyStrikes = async (dto: ListStrikesQueryDto, userId: string) => {
  const limit = resolveLimit(dto.limit);
  let cursor: { last_id: string; last_sort_key: string } | undefined;
  if (dto.cursor !== undefined) {
    try {
      cursor = decodeCursor(dto.cursor);
    } catch {
      return new ServiceError('validation_error', STRIKE_MESSAGES.LIST_FETCHED, 400, {
        cursor: ['Invalid cursor'],
      });
    }
  }
  const rows = await repo.listForProfessional({
    professionalUserId: userId,
    limit,
    ...(cursor ? { cursor } : {}),
    ...(dto.status ? { status: dto.status } : {}),
  });
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor({ last_id: last.id, last_sort_key: last.created_at.toISOString() })
      : null;

  // Summary attached to every list response so mobile can render the
  // "X strikes left before ban" UI without a separate call.
  const cfg = platformConfig.professional();
  // countCountingStrikes uses a runner; for a read-only list we use pool.query directly.
  const counting = await pool.query<{ n: string }>(
    `SELECT count(*)::text AS n FROM professional_strikes
      WHERE professional_user_id = $1 AND status IN ('active', 'upheld')`,
    [userId],
  );
  const total = await repo.countTotal(userId);
  const activeCount = Number(counting.rows[0]?.n ?? '0');

  return new ServiceSuccess(
    {
      items: page.map(toView),
      meta: { next_cursor: nextCursor, has_more: hasMore },
      summary: {
        active_count: activeCount,
        total_count: total,
        strikes_before_ban: cfg.strikes_before_ban,
        remaining_before_ban: Math.max(0, cfg.strikes_before_ban - activeCount),
      },
    },
    STRIKE_MESSAGES.LIST_FETCHED,
  );
};

// ── POST /strikes/:id/dispute ───────────────────────────────────────────────

export const disputeStrike = async (strikeId: string, dto: DisputeStrikeDto, userId: string) => {
  const cfg = platformConfig.professional();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const strike = await repo.findByIdForUpdate(client, strikeId);
    if (!strike || strike.professional_user_id !== userId) {
      await client.query('ROLLBACK');
      return new ServiceError('strike_not_found', STRIKE_MESSAGES.NOT_FOUND, 404);
    }
    if (strike.status !== StrikeStatus.ACTIVE) {
      await client.query('ROLLBACK');
      return new ServiceError('strike_not_disputable', STRIKE_MESSAGES.NOT_DISPUTABLE, 409);
    }
    const ageMs = Date.now() - strike.created_at.getTime();
    const windowMs = cfg.strike_dispute_window_days * 24 * 3600 * 1000;
    if (ageMs > windowMs) {
      await client.query('ROLLBACK');
      return new ServiceError(
        'strike_dispute_window_closed',
        STRIKE_MESSAGES.DISPUTE_WINDOW_CLOSED,
        409,
      );
    }
    await repo.setDisputed(client, strike.id, dto.comment);
    await client.query('COMMIT');
    const fresh = await repo.findById(strike.id);
    logger.info({ strikeId: strike.id, userId }, 'strike disputed');
    return new ServiceSuccess(toView(fresh!), STRIKE_MESSAGES.DISPUTED);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error({ err, strikeId }, 'disputeStrike tx failed');
    throw err;
  } finally {
    client.release();
  }
};

// ── GET /strikes/:id (user's own) ───────────────────────────────────────────

export const getMyStrike = async (strikeId: string, userId: string) => {
  const row = await repo.findById(strikeId);
  if (!row || row.professional_user_id !== userId) {
    return new ServiceError('strike_not_found', STRIKE_MESSAGES.NOT_FOUND, 404);
  }
  return new ServiceSuccess(toView(row), STRIKE_MESSAGES.FETCHED);
};

// ── Admin: list / uphold / void ─────────────────────────────────────────────

export const adminListStrikes = async (dto: AdminListStrikesQueryDto) => {
  const limit = resolveLimit(dto.limit);
  let cursor: { last_id: string; last_sort_key: string } | undefined;
  if (dto.cursor !== undefined) {
    try {
      cursor = decodeCursor(dto.cursor);
    } catch {
      return new ServiceError('validation_error', STRIKE_MESSAGES.ADMIN_LIST_FETCHED, 400, {
        cursor: ['Invalid cursor'],
      });
    }
  }
  const rows = await repo.adminList({
    limit,
    ...(cursor ? { cursor } : {}),
    ...(dto.status ? { status: dto.status } : {}),
    ...(dto.professional_user_id ? { professionalUserId: dto.professional_user_id } : {}),
    ...(dto.reason_code ? { reasonCode: dto.reason_code } : {}),
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
    STRIKE_MESSAGES.ADMIN_LIST_FETCHED,
  );
};

export const adminUpholdStrike = async (strikeId: string, dto: AdminUpholdStrikeDto) => {
  const cfg = platformConfig.professional();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const strike = await repo.findByIdForUpdate(client, strikeId);
    if (!strike) {
      await client.query('ROLLBACK');
      return new ServiceError('strike_not_found', STRIKE_MESSAGES.NOT_FOUND, 404);
    }
    if (strike.status !== StrikeStatus.DISPUTED) {
      await client.query('ROLLBACK');
      return new ServiceError('strike_not_disputable', STRIKE_MESSAGES.NOT_DISPUTABLE, 409);
    }
    await repo.setUpheld(client, strike.id, STUB_ADMIN_ID, dto.comment ?? null);
    // Re-check ban threshold — disputed strike going to upheld may push count
    // past the threshold for the first time (since disputed didn't count).
    const counting = await repo.countCountingStrikes(client, strike.professional_user_id);
    if (counting >= cfg.strikes_before_ban) {
      await client.query(
        `UPDATE users SET status = 'suspended', updated_at = now()
          WHERE id = $1 AND status = 'active'`,
        [strike.professional_user_id],
      );
      logger.warn(
        {
          professionalUserId: strike.professional_user_id,
          countingStrikes: counting,
        },
        'auto-ban: upheld strike pushed pro past threshold',
      );
    }
    await client.query('COMMIT');
    const fresh = await repo.findById(strike.id);
    return new ServiceSuccess(toView(fresh!), STRIKE_MESSAGES.UPHELD);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error({ err, strikeId }, 'adminUpholdStrike tx failed');
    throw err;
  } finally {
    client.release();
  }
};

export const adminVoidStrike = async (strikeId: string, dto: AdminVoidStrikeDto) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const strike = await repo.findByIdForUpdate(client, strikeId);
    if (!strike) {
      await client.query('ROLLBACK');
      return new ServiceError('strike_not_found', STRIKE_MESSAGES.NOT_FOUND, 404);
    }
    if (strike.status !== StrikeStatus.ACTIVE && strike.status !== StrikeStatus.DISPUTED) {
      await client.query('ROLLBACK');
      return new ServiceError('strike_not_disputable', STRIKE_MESSAGES.NOT_DISPUTABLE, 409);
    }
    await repo.setVoided(client, strike.id, STUB_ADMIN_ID, dto.reason);
    await client.query('COMMIT');
    const fresh = await repo.findById(strike.id);
    return new ServiceSuccess(toView(fresh!), STRIKE_MESSAGES.VOIDED);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error({ err, strikeId }, 'adminVoidStrike tx failed');
    throw err;
  } finally {
    client.release();
  }
};
