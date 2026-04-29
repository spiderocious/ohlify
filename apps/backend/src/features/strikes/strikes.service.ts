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
import {
  StrikeReason,
  StrikeStatus,
  SubjectRole,
  type StrikeRow,
  type StrikeView,
} from './strikes.types.js';

interface QueryRunner {
  query: PoolClient['query'];
}

const toView = (row: StrikeRow): StrikeView => ({
  id: row.id,
  subject_user_id: row.subject_user_id,
  subject_role: row.subject_role,
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
// gated by config. Each subject_role has its OWN config namespace
// (`professional.*` vs `caller.*`) and its own threshold.

export interface IssueStrikeInput {
  subjectUserId: string;
  subjectRole: SubjectRole;
  relatedCallId: string | null;
  relatedBookingId: string | null;
  reasonCode: StrikeReason;
  description: string | null;
}

const isTriggerEnabled = (subjectRole: SubjectRole, reason: StrikeReason): boolean => {
  if (subjectRole === SubjectRole.PROFESSIONAL) {
    const cfg = platformConfig.professional();
    return (
      (reason === StrikeReason.NO_SHOW && cfg.strike_on_no_show) ||
      (reason === StrikeReason.LATE_CANCEL && cfg.strike_on_late_cancel) ||
      (reason === StrikeReason.MID_CALL_QUIT && cfg.strike_on_mid_call_quit)
    );
  }
  // Caller
  const cfg = platformConfig.caller();
  return (
    (reason === StrikeReason.CALLER_NO_SHOW && cfg.strike_on_no_show) ||
    (reason === StrikeReason.CALLER_DISCONNECT && cfg.strike_on_disconnect)
  );
};

const banThresholdFor = (subjectRole: SubjectRole): number =>
  subjectRole === SubjectRole.PROFESSIONAL
    ? platformConfig.professional().strikes_before_ban
    : platformConfig.caller().strikes_before_ban;

const disputeWindowDaysFor = (subjectRole: SubjectRole): number =>
  subjectRole === SubjectRole.PROFESSIONAL
    ? platformConfig.professional().strike_dispute_window_days
    : platformConfig.caller().strike_dispute_window_days;

export const maybeIssueStrike = async (
  runner: QueryRunner,
  input: IssueStrikeInput,
): Promise<{ issued: boolean; banned: boolean; strikeId?: string }> => {
  if (!isTriggerEnabled(input.subjectRole, input.reasonCode)) {
    logger.info(
      {
        subjectUserId: input.subjectUserId,
        subjectRole: input.subjectRole,
        reason: input.reasonCode,
      },
      'strike trigger disabled in config; skipping',
    );
    return { issued: false, banned: false };
  }

  const strike = await repo.create(runner, input);
  const counting = await repo.countCountingStrikes(runner, input.subjectUserId, input.subjectRole);
  const threshold = banThresholdFor(input.subjectRole);
  let banned = false;
  if (counting >= threshold) {
    // Auto-ban: flip user status to suspended. Already-suspended is a no-op.
    await runner.query(
      `UPDATE users
          SET status = 'suspended', updated_at = now()
        WHERE id = $1 AND status = 'active'`,
      [input.subjectUserId],
    );
    banned = true;
    logger.warn(
      {
        subjectUserId: input.subjectUserId,
        subjectRole: input.subjectRole,
        countingStrikes: counting,
        threshold,
      },
      'auto-ban: user suspended on strike threshold',
    );
  }
  logger.info(
    {
      strikeId: strike.id,
      subjectUserId: input.subjectUserId,
      subjectRole: input.subjectRole,
      reason: input.reasonCode,
      countingAfter: counting,
      banned,
    },
    'strike issued',
  );
  return { issued: true, banned, strikeId: strike.id };
};

// ── GET /me/strikes ─────────────────────────────────────────────────────────
//
// Returns BOTH role's strikes for the authenticated user. Mobile renders
// per-role sections from the response. The summary block carries per-role
// counters so mobile can show "You have N strikes as a pro / M as a caller".

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
  const rows = await repo.listForSubject({
    subjectUserId: userId,
    limit,
    ...(cursor ? { cursor } : {}),
    ...(dto.status ? { status: dto.status } : {}),
    ...(dto.subject_role ? { subjectRole: dto.subject_role } : {}),
  });
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor({ last_id: last.id, last_sort_key: last.created_at.toISOString() })
      : null;

  // Per-role counters. Read directly from pool — these are bounded queries.
  const proCfg = platformConfig.professional();
  const callerCfg = platformConfig.caller();
  const counts = await pool.query<{ subject_role: SubjectRole; n: string }>(
    `SELECT subject_role, count(*)::text AS n
       FROM strikes
      WHERE subject_user_id = $1 AND status IN ('active', 'upheld')
      GROUP BY subject_role`,
    [userId],
  );
  const totals = await pool.query<{ subject_role: SubjectRole; n: string }>(
    `SELECT subject_role, count(*)::text AS n
       FROM strikes
      WHERE subject_user_id = $1
      GROUP BY subject_role`,
    [userId],
  );
  const proActive = Number(
    counts.rows.find((r) => r.subject_role === SubjectRole.PROFESSIONAL)?.n ?? '0',
  );
  const callerActive = Number(
    counts.rows.find((r) => r.subject_role === SubjectRole.CALLER)?.n ?? '0',
  );
  const proTotal = Number(
    totals.rows.find((r) => r.subject_role === SubjectRole.PROFESSIONAL)?.n ?? '0',
  );
  const callerTotal = Number(
    totals.rows.find((r) => r.subject_role === SubjectRole.CALLER)?.n ?? '0',
  );

  return new ServiceSuccess(
    {
      items: page.map(toView),
      meta: { next_cursor: nextCursor, has_more: hasMore },
      summary: {
        professional: {
          active_count: proActive,
          total_count: proTotal,
          strikes_before_ban: proCfg.strikes_before_ban,
          remaining_before_ban: Math.max(0, proCfg.strikes_before_ban - proActive),
        },
        caller: {
          active_count: callerActive,
          total_count: callerTotal,
          strikes_before_ban: callerCfg.strikes_before_ban,
          remaining_before_ban: Math.max(0, callerCfg.strikes_before_ban - callerActive),
        },
      },
    },
    STRIKE_MESSAGES.LIST_FETCHED,
  );
};

// ── POST /strikes/:id/dispute ───────────────────────────────────────────────

export const disputeStrike = async (strikeId: string, dto: DisputeStrikeDto, userId: string) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const strike = await repo.findByIdForUpdate(client, strikeId);
    if (!strike || strike.subject_user_id !== userId) {
      await client.query('ROLLBACK');
      return new ServiceError('strike_not_found', STRIKE_MESSAGES.NOT_FOUND, 404);
    }
    if (strike.status !== StrikeStatus.ACTIVE) {
      await client.query('ROLLBACK');
      return new ServiceError('strike_not_disputable', STRIKE_MESSAGES.NOT_DISPUTABLE, 409);
    }
    const ageMs = Date.now() - strike.created_at.getTime();
    const windowMs = disputeWindowDaysFor(strike.subject_role) * 24 * 3600 * 1000;
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
    logger.info(
      { strikeId: strike.id, userId, subjectRole: strike.subject_role },
      'strike disputed',
    );
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
  if (!row || row.subject_user_id !== userId) {
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
    ...(dto.subject_user_id ? { subjectUserId: dto.subject_user_id } : {}),
    ...(dto.subject_role ? { subjectRole: dto.subject_role } : {}),
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

export const adminUpholdStrike = async (
  strikeId: string,
  dto: AdminUpholdStrikeDto,
  adminId: string,
) => {
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
    await repo.setUpheld(client, strike.id, adminId, dto.comment ?? null);
    // Re-check ban threshold for the strike's role — disputed → upheld may
    // push count past threshold (since disputed didn't count).
    const counting = await repo.countCountingStrikes(
      client,
      strike.subject_user_id,
      strike.subject_role,
    );
    const threshold = banThresholdFor(strike.subject_role);
    if (counting >= threshold) {
      await client.query(
        `UPDATE users SET status = 'suspended', updated_at = now()
          WHERE id = $1 AND status = 'active'`,
        [strike.subject_user_id],
      );
      logger.warn(
        {
          subjectUserId: strike.subject_user_id,
          subjectRole: strike.subject_role,
          countingStrikes: counting,
        },
        'auto-ban: upheld strike pushed user past threshold',
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

export const adminVoidStrike = async (
  strikeId: string,
  dto: AdminVoidStrikeDto,
  adminId: string,
) => {
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
    await repo.setVoided(client, strike.id, adminId, dto.reason);
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
