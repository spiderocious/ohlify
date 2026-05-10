import type { PoolClient } from 'pg';

import * as auditRepo from '@features/admin/admin.audit.repo.js';
import * as bookingsRepo from '@features/bookings/bookings.repo.js';
import * as callsRepo from '@features/calls/calls.repo.js';
import { platformConfig } from '@lib/config/platform-config.service.js';
import { pool } from '@lib/db/pool.js';
import { logger } from '@lib/logger.js';
import { insertEvent, OutboxAggregateType, OutboxEventType } from '@lib/outbox/index.js';
import { decodeCursor, encodeCursor, resolveLimit } from '@lib/pagination.js';
import { ServiceError, ServiceSuccess } from '@lib/service-result.js';

import { STRIKE_MESSAGES } from './strikes.messages.js';
import * as repo from './strikes.repo.js';
import type {
  AdminIssueStrikeDto,
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
  type AdminStrikeDetailView,
  type AdminStrikeView,
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

const toAdminView = (row: repo.AdminStrikeRow): AdminStrikeView => ({
  id: row.id,
  subject: {
    id: row.subject_user_id,
    name: row.subject_name,
    avatar_url: row.subject_avatar_url,
    role: row.subject_role,
  },
  subject_role: row.subject_role,
  related_call_id: row.related_call_id,
  related_booking_id: row.related_booking_id,
  reason_code: row.reason_code,
  description: row.description,
  status: row.status,
  dispute_comment: row.dispute_comment,
  disputed_at: row.disputed_at?.toISOString() ?? null,
  admin_review_comment: row.admin_review_comment,
  reviewed_by_admin_id: row.reviewed_by_admin_id,
  reviewed_at: row.reviewed_at?.toISOString() ?? null,
  created_at: row.created_at.toISOString(),
});

// Reason ↔ subject_role pairing. Pro-side reasons can only be issued
// against a professional, caller-side reasons only against a caller.
// Mirrors the constraint the call resolver implicitly enforces (it knows
// the role at call time). Admin issuance is free-form so we validate
// here. If a generic admin_other reason is added later, allow it for
// either role.
const PRO_REASONS: ReadonlySet<StrikeReason> = new Set([
  StrikeReason.NO_SHOW,
  StrikeReason.LATE_CANCEL,
  StrikeReason.MID_CALL_QUIT,
]);
const CALLER_REASONS: ReadonlySet<StrikeReason> = new Set([
  StrikeReason.CALLER_NO_SHOW,
  StrikeReason.CALLER_DISCONNECT,
]);

const reasonMatchesRole = (reason: StrikeReason, role: SubjectRole): boolean =>
  role === SubjectRole.PROFESSIONAL ? PRO_REASONS.has(reason) : CALLER_REASONS.has(reason);

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
      items: page.map(toAdminView),
      meta: { next_cursor: nextCursor, has_more: hasMore },
    },
    STRIKE_MESSAGES.ADMIN_LIST_FETCHED,
  );
};

// Detail view for /admin/strikes/:id — adds related_call, related_booking,
// the user's per-status strike history, and the audit trail. Read-only.
export const adminGetStrike = async (strikeId: string) => {
  const row = await repo.findByIdAdmin(strikeId);
  if (!row) {
    return new ServiceError('strike_not_found', STRIKE_MESSAGES.NOT_FOUND, 404);
  }
  const base = toAdminView(row);
  const call = row.related_call_id ? await callsRepo.findById(row.related_call_id) : null;
  let booking = null;
  if (row.related_booking_id) {
    booking = await bookingsRepo.findById(row.related_booking_id);
  } else if (call) {
    booking = await bookingsRepo.findById(call.booking_id);
  }
  const counts = await repo.statusCountsForSubject(row.subject_user_id, row.subject_role);
  const trail = await auditRepo.trailFor('strike', row.id);
  const cfg =
    row.subject_role === SubjectRole.PROFESSIONAL
      ? platformConfig.professional()
      : platformConfig.caller();
  const detail: AdminStrikeDetailView = {
    ...base,
    related_call:
      call && booking
        ? {
            id: call.id,
            call_type: booking.call_type,
            scheduled_at: booking.start_at.toISOString(),
            status: call.status,
            connected_seconds: call.connected_seconds,
          }
        : null,
    related_booking: booking
      ? {
          id: booking.id,
          status: booking.status,
          created_at: booking.created_at.toISOString(),
        }
      : null,
    subject_strike_history: {
      total_count: counts.total,
      active_count: counts.active,
      upheld_count: counts.upheld,
      voided_count: counts.voided,
      strikes_before_ban: cfg.strikes_before_ban,
    },
    audit_trail: trail.map((t) => ({
      id: t.id,
      action: t.action,
      admin_id: t.admin_id,
      admin_email: t.admin_email,
      note: t.note,
      created_at: t.created_at.toISOString(),
    })),
  };
  return new ServiceSuccess(detail, STRIKE_MESSAGES.ADMIN_FETCHED);
};

// Admin manually issues a strike for off-platform misconduct (abusive
// support ticket, payment fraud, etc.). Reuses `maybeIssueStrike` so the
// auto-ban threshold logic is identical to system-issued strikes — DO NOT
// reimplement that path here. Audit log captures the action via the
// `auditAdmin` middleware on the route.
//
// `maybeIssueStrike` short-circuits when the per-config trigger flag is
// off (e.g. strike_on_no_show=false). For admin issuance we want to
// bypass that gate — admin is asserting the strike applies regardless of
// whether the same reason auto-fires from the resolver. We do this by
// inlining the create + ban-check rather than going through
// maybeIssueStrike's gate.
export const adminIssueStrike = async (dto: AdminIssueStrikeDto, _adminId: string) => {
  const subjectRole: SubjectRole = dto.subject_role;
  const reasonCode: StrikeReason = dto.reason_code;
  if (!reasonMatchesRole(reasonCode, subjectRole)) {
    return new ServiceError('strike_reason_role_mismatch', STRIKE_MESSAGES.ADMIN_INVALID, 400, {
      reason_code: ['Reason does not match the selected subject role'],
    });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Confirm subject user exists — repo.create has no FK on subject_user_id
    // beyond the strikes table's own constraint, so a 404 here gives the
    // admin a cleaner error than a deferred FK violation.
    const exists = await client.query<{ id: string }>(
      `SELECT id FROM users WHERE id = $1 LIMIT 1`,
      [dto.subject_user_id],
    );
    if (exists.rowCount === 0) {
      await client.query('ROLLBACK');
      return new ServiceError('user_not_found', STRIKE_MESSAGES.ADMIN_INVALID, 404, {
        subject_user_id: ['User not found'],
      });
    }

    const strike = await repo.create(client, {
      subjectUserId: dto.subject_user_id,
      subjectRole,
      relatedCallId: dto.related_call_id ?? null,
      relatedBookingId: dto.related_booking_id ?? null,
      reasonCode,
      description: dto.description,
    });

    // Auto-ban check — identical logic to maybeIssueStrike's path.
    const counting = await repo.countCountingStrikes(client, dto.subject_user_id, subjectRole);
    const threshold =
      subjectRole === SubjectRole.PROFESSIONAL
        ? platformConfig.professional().strikes_before_ban
        : platformConfig.caller().strikes_before_ban;
    let banned = false;
    if (counting >= threshold) {
      await client.query(
        `UPDATE users
            SET status = 'suspended', updated_at = now()
          WHERE id = $1 AND status = 'active'`,
        [dto.subject_user_id],
      );
      banned = true;
    }

    await insertEvent(client, {
      aggregateType: OutboxAggregateType.USER,
      aggregateId: dto.subject_user_id,
      eventType: OutboxEventType.STRIKE_ISSUED_BY_ADMIN,
      payload: {
        strike_id: strike.id,
        subject_user_id: dto.subject_user_id,
        subject_role: dto.subject_role,
        reason_code: dto.reason_code,
        related_report_id: dto.related_report_id ?? null,
        banned,
      },
    });

    await client.query('COMMIT');
    logger.info(
      {
        strikeId: strike.id,
        subjectUserId: dto.subject_user_id,
        subjectRole: dto.subject_role,
        countingAfter: counting,
        banned,
      },
      'admin issued strike',
    );

    const fresh = await repo.findByIdAdmin(strike.id);
    return new ServiceSuccess(toAdminView(fresh!), STRIKE_MESSAGES.ADMIN_ISSUED);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error({ err, dto }, 'adminIssueStrike tx failed');
    throw err;
  } finally {
    client.release();
  }
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

// NOTE on auto-unsuspend: voiding a strike does NOT auto-unsuspend the
// subject even if their counting strikes drop back below the ban
// threshold. This is intentional. Unsuspend is a deliberate moderation
// decision that may rely on context outside the strike (e.g. other open
// reports, payment chargebacks, prior pattern). Admins use the dedicated
// `/admin/users/:id/unsuspend` endpoint to reinstate users — keeping
// suspend state and strike state decoupled prevents surprising
// auto-flips when partial moderation actions are taken.
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
