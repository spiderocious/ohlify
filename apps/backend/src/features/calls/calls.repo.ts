import type { PoolClient } from 'pg';

import { pool } from '@lib/db/pool.js';
import { id as makeId } from '@lib/ids.js';

import type { BookingStatus, CallType, FeeMode } from '@features/bookings/bookings.types.js';

import type { CallEventRow, CallHistoryRow, CallRow, CallStatus } from './calls.types.js';

interface QueryRunner {
  query: PoolClient['query'];
}

export const create = async (runner: QueryRunner, bookingId: string): Promise<CallRow> => {
  const callId = makeId('c');
  const channelName = `call_${callId}`;
  const res = await runner.query<CallRow>(
    `INSERT INTO calls (id, booking_id, agora_channel_name)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [callId, bookingId, channelName],
  );
  return res.rows[0]!;
};

export const findById = async (callId: string): Promise<CallRow | null> => {
  const res = await pool.query<CallRow>(`SELECT * FROM calls WHERE id = $1 LIMIT 1`, [callId]);
  return res.rows[0] ?? null;
};

export const findByIdForUpdate = async (
  runner: QueryRunner,
  callId: string,
): Promise<CallRow | null> => {
  const res = await runner.query<CallRow>(`SELECT * FROM calls WHERE id = $1 LIMIT 1 FOR UPDATE`, [
    callId,
  ]);
  return res.rows[0] ?? null;
};

export const findByBookingId = async (bookingId: string): Promise<CallRow | null> => {
  const res = await pool.query<CallRow>(`SELECT * FROM calls WHERE booking_id = $1 LIMIT 1`, [
    bookingId,
  ]);
  return res.rows[0] ?? null;
};

export const findByChannelName = async (
  runner: QueryRunner,
  channelName: string,
): Promise<CallRow | null> => {
  const res = await runner.query<CallRow>(
    `SELECT * FROM calls WHERE agora_channel_name = $1 LIMIT 1 FOR UPDATE`,
    [channelName],
  );
  return res.rows[0] ?? null;
};

interface ListInput {
  userId: string;
  limit: number;
  cursor?: { last_id: string; last_sort_key: string };
  status?: CallStatus;
}

export const listForUser = async (input: ListInput): Promise<CallRow[]> => {
  const params: unknown[] = [input.userId, input.userId];
  const filters: string[] = [`(b.caller_user_id = $1 OR b.callee_user_id = $2)`];
  if (input.status !== undefined) {
    params.push(input.status);
    filters.push(`c.status = $${params.length}::call_status`);
  }
  if (input.cursor !== undefined) {
    params.push(input.cursor.last_sort_key);
    params.push(input.cursor.last_id);
    filters.push(
      `(c.created_at < $${params.length - 1}::timestamptz OR (c.created_at = $${params.length - 1}::timestamptz AND c.id < $${params.length}))`,
    );
  }
  params.push(input.limit + 1);

  const res = await pool.query<CallRow>(
    `SELECT c.*
       FROM calls c
       JOIN bookings b ON b.id = c.booking_id
      WHERE ${filters.join(' AND ')}
      ORDER BY c.created_at DESC, c.id DESC
      LIMIT $${params.length}`,
    params,
  );
  return res.rows;
};

// ── Unified call history (calls ⨝ bookings) ─────────────────────────────────

interface ListHistoryInput {
  userId: string;
  role: 'caller' | 'callee' | 'either';
  limit: number;
  cursor?: { last_id: string; last_sort_key: string };
  bookingStatus?: BookingStatus;
  callStatus?: CallStatus;
}

interface RawHistoryRow {
  call_id: string;
  call_status: CallStatus;
  agora_channel_name: string;
  caller_joined_at: Date | null;
  callee_joined_at: Date | null;
  caller_left_at: Date | null;
  callee_left_at: Date | null;
  connected_seconds: number;
  settlement_journal_id: string | null;
  refund_journal_id: string | null;
  ended_at: Date | null;
  call_created_at: Date;
  booking_id: string;
  booking_status: BookingStatus;
  caller_user_id: string;
  callee_user_id: string;
  caller_full_name: string | null;
  caller_avatar_url: string | null;
  callee_full_name: string | null;
  callee_avatar_url: string | null;
  rate_id: string;
  call_type: CallType;
  start_at: Date;
  duration_minutes: number;
  total_paid_kobo: string;
  payee_amount_kobo: string;
  platform_fee_kobo: string;
  fee_mode_used: FeeMode;
  cancelled_at: Date | null;
  cancelled_by_user_id: string | null;
  booking_created_at: Date;
}

const HISTORY_SELECT = `
  c.id                     AS call_id,
  c.status                 AS call_status,
  c.agora_channel_name     AS agora_channel_name,
  c.caller_joined_at       AS caller_joined_at,
  c.callee_joined_at       AS callee_joined_at,
  c.caller_left_at         AS caller_left_at,
  c.callee_left_at         AS callee_left_at,
  c.connected_seconds      AS connected_seconds,
  c.settlement_journal_id  AS settlement_journal_id,
  c.refund_journal_id      AS refund_journal_id,
  c.ended_at               AS ended_at,
  c.created_at             AS call_created_at,
  b.id                     AS booking_id,
  b.status                 AS booking_status,
  b.caller_user_id         AS caller_user_id,
  b.callee_user_id         AS callee_user_id,
  ur.full_name             AS caller_full_name,
  ur.avatar_url            AS caller_avatar_url,
  ue.full_name             AS callee_full_name,
  ue.avatar_url            AS callee_avatar_url,
  b.rate_id                AS rate_id,
  b.call_type              AS call_type,
  b.start_at               AS start_at,
  b.duration_minutes       AS duration_minutes,
  b.total_paid_kobo        AS total_paid_kobo,
  b.payee_amount_kobo      AS payee_amount_kobo,
  b.platform_fee_kobo      AS platform_fee_kobo,
  b.fee_mode_used          AS fee_mode_used,
  b.cancelled_at           AS cancelled_at,
  b.cancelled_by_user_id   AS cancelled_by_user_id,
  b.created_at             AS booking_created_at
`;

// Both joins are LEFT JOINs so a soft-deleted user (deleted_at IS NOT NULL)
// still surfaces the call row — name/avatar simply come back NULL and the
// client falls back to a placeholder. Aliases: ur = "user-as-caller", ue =
// "user-as-callee".
const HISTORY_FROM = `
  FROM calls c
  JOIN bookings b ON b.id = c.booking_id
  LEFT JOIN users ur ON ur.id = b.caller_user_id
  LEFT JOIN users ue ON ue.id = b.callee_user_id
`;

const toHistoryRow = (r: RawHistoryRow): CallHistoryRow => ({
  call_id: r.call_id,
  call_status: r.call_status,
  agora_channel_name: r.agora_channel_name,
  caller_joined_at: r.caller_joined_at,
  callee_joined_at: r.callee_joined_at,
  caller_left_at: r.caller_left_at,
  callee_left_at: r.callee_left_at,
  connected_seconds: r.connected_seconds,
  settlement_journal_id: r.settlement_journal_id,
  refund_journal_id: r.refund_journal_id,
  ended_at: r.ended_at,
  call_created_at: r.call_created_at,
  booking_id: r.booking_id,
  booking_status: r.booking_status,
  caller_user_id: r.caller_user_id,
  callee_user_id: r.callee_user_id,
  caller_full_name: r.caller_full_name,
  caller_avatar_url: r.caller_avatar_url,
  callee_full_name: r.callee_full_name,
  callee_avatar_url: r.callee_avatar_url,
  rate_id: r.rate_id,
  call_type: r.call_type,
  start_at: r.start_at,
  duration_minutes: r.duration_minutes,
  total_paid_kobo: r.total_paid_kobo,
  payee_amount_kobo: r.payee_amount_kobo,
  platform_fee_kobo: r.platform_fee_kobo,
  fee_mode_used: r.fee_mode_used,
  cancelled_at: r.cancelled_at,
  cancelled_by_user_id: r.cancelled_by_user_id,
  booking_created_at: r.booking_created_at,
});

export const listHistoryForUser = async (input: ListHistoryInput): Promise<CallHistoryRow[]> => {
  const params: unknown[] = [];
  const filters: string[] = [];

  if (input.role === 'caller') {
    params.push(input.userId);
    filters.push(`b.caller_user_id = $${params.length}`);
  } else if (input.role === 'callee') {
    params.push(input.userId);
    filters.push(`b.callee_user_id = $${params.length}`);
  } else {
    params.push(input.userId);
    params.push(input.userId);
    filters.push(
      `(b.caller_user_id = $${params.length - 1} OR b.callee_user_id = $${params.length})`,
    );
  }

  if (input.bookingStatus !== undefined) {
    params.push(input.bookingStatus);
    filters.push(`b.status = $${params.length}::booking_status`);
  }
  if (input.callStatus !== undefined) {
    params.push(input.callStatus);
    filters.push(`c.status = $${params.length}::call_status`);
  }
  if (input.cursor !== undefined) {
    params.push(input.cursor.last_sort_key);
    params.push(input.cursor.last_id);
    filters.push(
      `(b.start_at < $${params.length - 1}::timestamptz OR (b.start_at = $${params.length - 1}::timestamptz AND b.id < $${params.length}))`,
    );
  }
  params.push(input.limit + 1);

  const res = await pool.query<RawHistoryRow>(
    `SELECT ${HISTORY_SELECT}
     ${HISTORY_FROM}
      WHERE ${filters.join(' AND ')}
      ORDER BY b.start_at DESC, b.id DESC
      LIMIT $${params.length}`,
    params,
  );
  return res.rows.map(toHistoryRow);
};

export const findHistoryByCallId = async (callId: string): Promise<CallHistoryRow | null> => {
  const res = await pool.query<RawHistoryRow>(
    `SELECT ${HISTORY_SELECT}
     ${HISTORY_FROM}
      WHERE c.id = $1
      LIMIT 1`,
    [callId],
  );
  return res.rows[0] ? toHistoryRow(res.rows[0]) : null;
};

export const setCallerJoined = async (runner: QueryRunner, callId: string): Promise<void> => {
  await runner.query(
    `UPDATE calls SET caller_joined_at = COALESCE(caller_joined_at, now()), updated_at = now()
      WHERE id = $1`,
    [callId],
  );
};

export const setCalleeJoined = async (runner: QueryRunner, callId: string): Promise<void> => {
  await runner.query(
    `UPDATE calls SET callee_joined_at = COALESCE(callee_joined_at, now()), updated_at = now()
      WHERE id = $1`,
    [callId],
  );
};

export const setCallerLeft = async (runner: QueryRunner, callId: string): Promise<void> => {
  await runner.query(`UPDATE calls SET caller_left_at = now(), updated_at = now() WHERE id = $1`, [
    callId,
  ]);
};

export const setCalleeLeft = async (runner: QueryRunner, callId: string): Promise<void> => {
  await runner.query(`UPDATE calls SET callee_left_at = now(), updated_at = now() WHERE id = $1`, [
    callId,
  ]);
};

export const setStatus = async (
  runner: QueryRunner,
  callId: string,
  status: CallStatus,
): Promise<void> => {
  await runner.query(
    `UPDATE calls SET status = $2::call_status, updated_at = now() WHERE id = $1`,
    [callId, status],
  );
};

export const setTerminalState = async (
  runner: QueryRunner,
  callId: string,
  status: CallStatus,
  connectedSeconds: number,
  settlementJournalId: string | null,
  refundJournalId: string | null,
): Promise<void> => {
  await runner.query(
    `UPDATE calls
        SET status = $2::call_status,
            connected_seconds = $3,
            settlement_journal_id = COALESCE($4, settlement_journal_id),
            refund_journal_id = COALESCE($5, refund_journal_id),
            ended_at = COALESCE(ended_at, now()),
            updated_at = now()
      WHERE id = $1`,
    [callId, status, connectedSeconds, settlementJournalId, refundJournalId],
  );
};

// ── Call events ─────────────────────────────────────────────────────────────

export const recordEvent = async (
  runner: QueryRunner,
  input: { callId: string; eventType: string; payload?: Record<string, unknown> },
): Promise<void> => {
  await runner.query(
    `INSERT INTO call_events (id, call_id, event_type, payload)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [makeId('ce'), input.callId, input.eventType, JSON.stringify(input.payload ?? {})],
  );
};

export const listEvents = async (callId: string): Promise<CallEventRow[]> => {
  const res = await pool.query<CallEventRow>(
    `SELECT * FROM call_events WHERE call_id = $1 ORDER BY occurred_at ASC, id ASC`,
    [callId],
  );
  return res.rows;
};

// ── Cron support ────────────────────────────────────────────────────────────

export const findCallsToStart = async (
  runner: QueryRunner,
  graceSeconds: number,
  limit: number,
): Promise<Array<CallRow & { start_at: Date }>> => {
  // Find scheduled calls whose start_at has passed (no grace yet — grace is
  // for no-show resolution, not for the flip itself).
  const res = await runner.query<CallRow & { start_at: Date }>(
    `SELECT c.*, b.start_at
       FROM calls c
       JOIN bookings b ON b.id = c.booking_id
      WHERE c.status = 'scheduled'
        AND b.start_at <= now()
      ORDER BY b.start_at ASC
      LIMIT $1
      FOR UPDATE OF c SKIP LOCKED`,
    [limit],
  );
  return res.rows;
};

export const findCallsToResolveNoShow = async (
  runner: QueryRunner,
  graceSeconds: number,
  limit: number,
): Promise<Array<CallRow & { start_at: Date }>> => {
  const res = await runner.query<CallRow & { start_at: Date }>(
    `SELECT c.*, b.start_at
       FROM calls c
       JOIN bookings b ON b.id = c.booking_id
      WHERE c.status = 'waiting_for_parties'
        AND b.start_at + ($1 * INTERVAL '1 second') <= now()
      ORDER BY b.start_at ASC
      LIMIT $2
      FOR UPDATE OF c SKIP LOCKED`,
    [graceSeconds, limit],
  );
  return res.rows;
};

export const findStuckInProgressCalls = async (
  runner: QueryRunner,
  staleAfterSeconds: number,
  limit: number,
): Promise<Array<CallRow & { start_at: Date; duration_minutes: number }>> => {
  const res = await runner.query<CallRow & { start_at: Date; duration_minutes: number }>(
    `SELECT c.*, b.start_at, b.duration_minutes
       FROM calls c
       JOIN bookings b ON b.id = c.booking_id
      WHERE c.status = 'in_progress'
        AND b.start_at + (b.duration_minutes * INTERVAL '1 minute') + ($1 * INTERVAL '1 second') <= now()
      ORDER BY b.start_at ASC
      LIMIT $2
      FOR UPDATE OF c SKIP LOCKED`,
    [staleAfterSeconds, limit],
  );
  return res.rows;
};

export interface JoinableCallRow extends CallRow {
  caller_user_id: string;
  callee_user_id: string;
  start_at: Date;
  duration_minutes: number;
  peer_full_name: string | null;
  peer_avatar_url: string | null;
}

/**
 * Calls the user can join right now (`waiting_for_parties` or
 * `in_progress`). Joined with `users` to bring in the OTHER party's
 * display name + avatar so the client can render an incoming-call card
 * without a second round-trip.
 */
export const listJoinableForUser = async (userId: string): Promise<JoinableCallRow[]> => {
  const res = await pool.query<JoinableCallRow>(
    `SELECT c.*,
            b.caller_user_id,
            b.callee_user_id,
            b.start_at,
            b.duration_minutes,
            CASE
              WHEN b.caller_user_id = $1 THEN ue.full_name
              ELSE ur.full_name
            END AS peer_full_name,
            CASE
              WHEN b.caller_user_id = $1 THEN ue.avatar_url
              ELSE ur.avatar_url
            END AS peer_avatar_url
       FROM calls c
       JOIN bookings b ON b.id = c.booking_id
       LEFT JOIN users ur ON ur.id = b.caller_user_id
       LEFT JOIN users ue ON ue.id = b.callee_user_id
      WHERE (b.caller_user_id = $1 OR b.callee_user_id = $1)
        AND c.status IN ('waiting_for_parties','in_progress')
      ORDER BY b.start_at ASC
      LIMIT 20`,
    [userId],
  );
  return res.rows;
};
