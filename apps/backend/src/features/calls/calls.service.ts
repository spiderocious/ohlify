import * as bookingsRepo from '@features/bookings/bookings.repo.js';
import { agoraUidForUserId, issueAgoraRtcToken } from '@lib/agora/index.js';
import { platformConfig } from '@lib/config/platform-config.service.js';
import { pool } from '@lib/db/pool.js';
import { logger } from '@lib/logger.js';
import { koboToJson } from '@lib/money.js';
import { decodeCursor, encodeCursor, resolveLimit } from '@lib/pagination.js';
import { ServiceError, ServiceSuccess } from '@lib/service-result.js';

import { CALL_MESSAGES } from './calls.messages.js';
import * as repo from './calls.repo.js';
import { resolveCall } from './calls.resolver.js';
import type { ListCallHistoryQueryDto, ListCallsQueryDto } from './calls.schema.js';
import {
  CallStatus,
  type CallHistoryRow,
  type CallHistoryView,
  type CallJoinView,
  type CallRow,
  type CallView,
} from './calls.types.js';

const toView = (row: CallRow): CallView => ({
  id: row.id,
  booking_id: row.booking_id,
  status: row.status,
  agora_channel_name: row.agora_channel_name,
  connected_seconds: row.connected_seconds,
  caller_joined_at: row.caller_joined_at?.toISOString() ?? null,
  callee_joined_at: row.callee_joined_at?.toISOString() ?? null,
  caller_left_at: row.caller_left_at?.toISOString() ?? null,
  callee_left_at: row.callee_left_at?.toISOString() ?? null,
  ended_at: row.ended_at?.toISOString() ?? null,
  settlement_journal_id: row.settlement_journal_id,
  refund_journal_id: row.refund_journal_id,
  created_at: row.created_at.toISOString(),
});

// Picks the OTHER side of the call relative to the viewer. If the viewer
// matches neither side (shouldn't happen — we authorize before serving)
// we fall back to the callee, which preserves the most useful info for
// a customer-driven booking.
const pickPeer = (
  row: CallHistoryRow,
  viewerUserId: string,
): { id: string; name: string | null; avatar: string | null } => {
  if (row.caller_user_id === viewerUserId) {
    return {
      id: row.callee_user_id,
      name: row.callee_full_name,
      avatar: row.callee_avatar_url,
    };
  }
  return {
    id: row.caller_user_id,
    name: row.caller_full_name,
    avatar: row.caller_avatar_url,
  };
};

const toHistoryView = (row: CallHistoryRow, viewerUserId: string): CallHistoryView => {
  const peer = pickPeer(row, viewerUserId);
  return {
    call_id: row.call_id,
    booking_id: row.booking_id,
    caller_user_id: row.caller_user_id,
    callee_user_id: row.callee_user_id,
    peer_user_id: peer.id,
    peer_name: peer.name,
    peer_avatar_url: peer.avatar,
    rate_id: row.rate_id,
    call_type: row.call_type,
    start_at: row.start_at.toISOString(),
    duration_minutes: row.duration_minutes,
    total_paid_kobo: koboToJson(BigInt(row.total_paid_kobo)),
    payee_amount_kobo: koboToJson(BigInt(row.payee_amount_kobo)),
    platform_fee_kobo: koboToJson(BigInt(row.platform_fee_kobo)),
    fee_mode_used: row.fee_mode_used,
    booking_status: row.booking_status,
    cancelled_at: row.cancelled_at?.toISOString() ?? null,
    cancelled_by_user_id: row.cancelled_by_user_id,
    call_status: row.call_status,
    agora_channel_name: row.agora_channel_name,
    caller_joined_at: row.caller_joined_at?.toISOString() ?? null,
    callee_joined_at: row.callee_joined_at?.toISOString() ?? null,
    caller_left_at: row.caller_left_at?.toISOString() ?? null,
    callee_left_at: row.callee_left_at?.toISOString() ?? null,
    connected_seconds: row.connected_seconds,
    settlement_journal_id: row.settlement_journal_id,
    refund_journal_id: row.refund_journal_id,
    ended_at: row.ended_at?.toISOString() ?? null,
    created_at: row.booking_created_at.toISOString(),
  };
};

// ── GET /calls ──────────────────────────────────────────────────────────────

export const listCalls = async (dto: ListCallsQueryDto, userId: string) => {
  const limit = resolveLimit(dto.limit);
  let cursor: { last_id: string; last_sort_key: string } | undefined;
  if (dto.cursor !== undefined) {
    try {
      cursor = decodeCursor(dto.cursor);
    } catch {
      return new ServiceError('validation_error', CALL_MESSAGES.LIST_FETCHED, 400, {
        cursor: ['Invalid cursor'],
      });
    }
  }
  const rows = await repo.listForUser({
    userId,
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
  return new ServiceSuccess(
    {
      items: page.map(toView),
      meta: { next_cursor: nextCursor, has_more: hasMore },
    },
    CALL_MESSAGES.LIST_FETCHED,
  );
};

// ── GET /calls/:id ──────────────────────────────────────────────────────────

export const getCall = async (callId: string, userId: string) => {
  const row = await repo.findById(callId);
  if (!row) return new ServiceError('call_not_found', CALL_MESSAGES.NOT_FOUND, 404);
  const booking = await bookingsRepo.findById(row.booking_id);
  if (!booking || (booking.caller_user_id !== userId && booking.callee_user_id !== userId)) {
    return new ServiceError('call_not_found', CALL_MESSAGES.NOT_FOUND, 404);
  }
  return new ServiceSuccess(toView(row), CALL_MESSAGES.FETCHED);
};

// ── GET /calls/history ──────────────────────────────────────────────────────
//
// Unified bookings + calls timeline. Sorts by booking.start_at DESC so that
// upcoming calls bubble to the top. Filtering by booking_status and call_status
// is independent — frontend uses booking_status for the Cancelled tab,
// call_status for the Completed tab, and the union for All.

export const listCallHistory = async (dto: ListCallHistoryQueryDto, userId: string) => {
  const limit = resolveLimit(dto.limit);
  let cursor: { last_id: string; last_sort_key: string } | undefined;
  if (dto.cursor !== undefined) {
    try {
      cursor = decodeCursor(dto.cursor);
    } catch {
      return new ServiceError('validation_error', CALL_MESSAGES.HISTORY_LIST_FETCHED, 400, {
        cursor: ['Invalid cursor'],
      });
    }
  }
  const rows = await repo.listHistoryForUser({
    userId,
    role: dto.role ?? 'either',
    limit,
    ...(cursor ? { cursor } : {}),
    ...(dto.booking_status ? { bookingStatus: dto.booking_status } : {}),
    ...(dto.call_status ? { callStatus: dto.call_status } : {}),
  });
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor({ last_id: last.booking_id, last_sort_key: last.start_at.toISOString() })
      : null;
  return new ServiceSuccess(
    {
      items: page.map((r) => toHistoryView(r, userId)),
      meta: { next_cursor: nextCursor, has_more: hasMore },
    },
    CALL_MESSAGES.HISTORY_LIST_FETCHED,
  );
};

// ── GET /calls/history/:id ──────────────────────────────────────────────────

export const getCallHistoryItem = async (callId: string, userId: string) => {
  const row = await repo.findHistoryByCallId(callId);
  if (!row || (row.caller_user_id !== userId && row.callee_user_id !== userId)) {
    return new ServiceError('call_not_found', CALL_MESSAGES.NOT_FOUND, 404);
  }
  return new ServiceSuccess(toHistoryView(row, userId), CALL_MESSAGES.HISTORY_FETCHED);
};

// ── POST /calls/:id/join ────────────────────────────────────────────────────

const issueJoinToken = (
  call: CallRow,
  userId: string,
  _isCaller: boolean,
  remoteUserId: string,
  callType: 'audio' | 'video',
  durationMinutes: number,
  totalPaidKobo: bigint,
): CallJoinView => {
  const cfg = platformConfig.bookings();
  const tokenResult = issueAgoraRtcToken({
    channelName: call.agora_channel_name,
    uid: agoraUidForUserId(userId),
    role: 'publisher',
    expiresInSeconds: cfg.token_expires_seconds,
  });

  return {
    call_id: call.id,
    agora_app_id: tokenResult.appId,
    agora_channel_name: call.agora_channel_name,
    agora_uid: tokenResult.uid,
    agora_token: tokenResult.token,
    expires_at: tokenResult.expiresAt.toISOString(),
    call_type: callType,
    duration_minutes: durationMinutes,
    remote_user_id: remoteUserId,
    total_paid_kobo: koboToJson(totalPaidKobo),
  };
};

export const joinCall = async (callId: string, userId: string) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const call = await repo.findByIdForUpdate(client, callId);
    if (!call) {
      await client.query('ROLLBACK');
      return new ServiceError('call_not_found', CALL_MESSAGES.NOT_FOUND, 404);
    }
    const booking = await bookingsRepo.findByIdForUpdate(client, call.booking_id);
    if (!booking) {
      await client.query('ROLLBACK');
      return new ServiceError('call_not_found', CALL_MESSAGES.NOT_FOUND, 404);
    }
    const isCaller = booking.caller_user_id === userId;
    const isCallee = booking.callee_user_id === userId;
    if (!isCaller && !isCallee) {
      await client.query('ROLLBACK');
      return new ServiceError('call_not_found', CALL_MESSAGES.NOT_FOUND, 404);
    }

    // Joinable while scheduled/waiting/in_progress. Terminal states reject.
    const joinableStatuses: readonly CallStatus[] = [
      CallStatus.SCHEDULED,
      CallStatus.WAITING_FOR_PARTIES,
      CallStatus.IN_PROGRESS,
    ];
    if (!joinableStatuses.includes(call.status)) {
      await client.query('ROLLBACK');
      return new ServiceError('call_not_joinable', CALL_MESSAGES.NOT_JOINABLE, 409);
    }

    // Record the join (idempotent: if already joined, COALESCE keeps the
    // earlier timestamp).
    if (isCaller) {
      await repo.setCallerJoined(client, call.id);
    } else {
      await repo.setCalleeJoined(client, call.id);
    }
    await repo.recordEvent(client, {
      callId: call.id,
      eventType: isCaller ? 'caller_joined' : 'callee_joined',
      payload: { user_id: userId, source: 'api' },
    });

    // Determine if we should flip status. If both have joined now, → in_progress.
    const refreshed = await repo.findByIdForUpdate(client, call.id);
    const bothJoined = !!refreshed!.caller_joined_at && !!refreshed!.callee_joined_at;
    if (bothJoined && refreshed!.status !== CallStatus.IN_PROGRESS) {
      await repo.setStatus(client, call.id, CallStatus.IN_PROGRESS);
    } else if (refreshed!.status === CallStatus.SCHEDULED) {
      // First joiner pulls the call from scheduled → waiting (so the no-show
      // resolver doesn't grace-fail something that's actually being joined).
      await repo.setStatus(client, call.id, CallStatus.WAITING_FOR_PARTIES);
    }

    await client.query('COMMIT');

    const remoteUserId = isCaller ? booking.callee_user_id : booking.caller_user_id;
    const view = issueJoinToken(
      call,
      userId,
      isCaller,
      remoteUserId,
      booking.call_type,
      booking.duration_minutes,
      BigInt(booking.total_paid_kobo),
    );
    logger.info(
      { callId: call.id, userId, role: isCaller ? 'caller' : 'callee' },
      'call join token issued',
    );
    return new ServiceSuccess(view, CALL_MESSAGES.JOIN_OK);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error({ err, callId }, 'joinCall tx failed');
    throw err;
  } finally {
    client.release();
  }
};

// ── POST /calls/:id/renew-token ─────────────────────────────────────────────

export const renewToken = async (callId: string, userId: string) => {
  const call = await repo.findById(callId);
  if (!call) return new ServiceError('call_not_found', CALL_MESSAGES.NOT_FOUND, 404);
  const booking = await bookingsRepo.findById(call.booking_id);
  if (!booking || (booking.caller_user_id !== userId && booking.callee_user_id !== userId)) {
    return new ServiceError('call_not_found', CALL_MESSAGES.NOT_FOUND, 404);
  }
  const joinableStatuses: readonly CallStatus[] = [
    CallStatus.SCHEDULED,
    CallStatus.WAITING_FOR_PARTIES,
    CallStatus.IN_PROGRESS,
  ];
  if (!joinableStatuses.includes(call.status)) {
    return new ServiceError('call_not_joinable', CALL_MESSAGES.NOT_JOINABLE, 409);
  }
  const isCaller = booking.caller_user_id === userId;
  const remoteUserId = isCaller ? booking.callee_user_id : booking.caller_user_id;
  const view = issueJoinToken(
    call,
    userId,
    isCaller,
    remoteUserId,
    booking.call_type,
    booking.duration_minutes,
    BigInt(booking.total_paid_kobo),
  );
  return new ServiceSuccess(view, CALL_MESSAGES.TOKEN_RENEWED);
};

// ── POST /calls/:id/leave ───────────────────────────────────────────────────

// ── POST /calls/:id/decline (callee polite-decline) ─────────────────────────
//
// Within `bookings.polite_decline_window_seconds` of the call's
// `start_at`, the callee may tap Decline. Caller gets a full refund,
// the pro keeps a clean record. Outside the window we fall through to
// the standard no-show treatment (refund + strike), same as if the pro
// had simply not shown up.

export const declineCall = async (callId: string, userId: string) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const call = await repo.findByIdForUpdate(client, callId);
    if (!call) {
      await client.query('ROLLBACK');
      return new ServiceError('call_not_found', CALL_MESSAGES.NOT_FOUND, 404);
    }
    const booking = await bookingsRepo.findByIdForUpdate(client, call.booking_id);
    if (!booking || booking.callee_user_id !== userId) {
      // Decline is callee-only. Hide the 403 behind 404 to avoid leaking
      // that a call with this id exists for some other user pair.
      await client.query('ROLLBACK');
      return new ServiceError('call_not_found', CALL_MESSAGES.NOT_FOUND, 404);
    }
    if (call.status !== CallStatus.SCHEDULED && call.status !== CallStatus.WAITING_FOR_PARTIES) {
      await client.query('ROLLBACK');
      return new ServiceError('call_not_joinable', CALL_MESSAGES.NOT_JOINABLE, 409, {
        status: ['Call is not in a declinable state'],
      });
    }

    // Polite window starts at booking.start_at (the same instant the
    // call-starter cron flips the call to `waiting_for_parties`). Using
    // start_at — rather than the flip timestamp — keeps the window
    // honest even if the cron is briefly late.
    const cfg = platformConfig.bookings();
    const elapsedSeconds = Math.max(
      0,
      Math.floor((Date.now() - booking.start_at.getTime()) / 1000),
    );
    const reason: 'polite_decline' | 'no_show_grace' =
      elapsedSeconds <= cfg.polite_decline_window_seconds ? 'polite_decline' : 'no_show_grace';

    await repo.recordEvent(client, {
      callId: call.id,
      eventType: 'callee_declined',
      payload: { user_id: userId, source: 'api', elapsed_seconds: elapsedSeconds, reason },
    });
    await resolveCall(client, call.id, reason);

    await client.query('COMMIT');
    const fresh = await repo.findById(call.id);
    return new ServiceSuccess(toView(fresh!), CALL_MESSAGES.DECLINED);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error({ err, callId }, 'declineCall tx failed');
    throw err;
  } finally {
    client.release();
  }
};

// ── GET /calls/joinable ─────────────────────────────────────────────────────
//
// Returns the calls that are *right now* ready for the user to join —
// status `waiting_for_parties` or `in_progress`. Drives the web client's
// sticky "Join now" banner (polled every 15s in MainShellLayout). The
// list endpoint already supports a status filter; this is a narrow,
// caller-or-callee aware view so the client can identify their role
// without a second round-trip.

export const listJoinableCalls = async (userId: string) => {
  const rows = await repo.listJoinableForUser(userId);
  const items = rows.map((r) => ({
    call_id: r.id,
    booking_id: r.booking_id,
    status: r.status,
    agora_channel_name: r.agora_channel_name,
    start_at: r.start_at?.toISOString() ?? null,
    duration_minutes: r.duration_minutes,
    is_caller: r.caller_user_id === userId,
    peer_user_id: r.caller_user_id === userId ? r.callee_user_id : r.caller_user_id,
    peer_full_name: r.peer_full_name,
    peer_avatar_url: r.peer_avatar_url,
  }));
  return new ServiceSuccess({ items }, CALL_MESSAGES.JOINABLE_FETCHED);
};

export const leaveCall = async (callId: string, userId: string) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const call = await repo.findByIdForUpdate(client, callId);
    if (!call) {
      await client.query('ROLLBACK');
      return new ServiceError('call_not_found', CALL_MESSAGES.NOT_FOUND, 404);
    }
    const booking = await bookingsRepo.findByIdForUpdate(client, call.booking_id);
    if (!booking || (booking.caller_user_id !== userId && booking.callee_user_id !== userId)) {
      await client.query('ROLLBACK');
      return new ServiceError('call_not_found', CALL_MESSAGES.NOT_FOUND, 404);
    }
    const isCaller = booking.caller_user_id === userId;

    if (isCaller) {
      await repo.setCallerLeft(client, call.id);
    } else {
      await repo.setCalleeLeft(client, call.id);
    }
    await repo.recordEvent(client, {
      callId: call.id,
      eventType: isCaller ? 'caller_left' : 'callee_left',
      payload: { user_id: userId, source: 'api' },
    });

    // If both have now left, resolve the call atomically.
    const refreshed = await repo.findByIdForUpdate(client, call.id);
    if (
      refreshed!.status !== CallStatus.IN_PROGRESS &&
      refreshed!.status !== CallStatus.WAITING_FOR_PARTIES
    ) {
      // Already terminal — no-op.
      await client.query('COMMIT');
      const fresh = await repo.findById(call.id);
      return new ServiceSuccess(toView(fresh!), CALL_MESSAGES.LEAVE_OK);
    }

    const bothLeft = !!refreshed!.caller_left_at && !!refreshed!.callee_left_at;
    if (bothLeft && refreshed!.status === CallStatus.IN_PROGRESS) {
      await resolveCall(client, call.id, 'both_left');
    }

    await client.query('COMMIT');
    const fresh = await repo.findById(call.id);
    return new ServiceSuccess(toView(fresh!), CALL_MESSAGES.LEAVE_OK);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error({ err, callId }, 'leaveCall tx failed');
    throw err;
  } finally {
    client.release();
  }
};
