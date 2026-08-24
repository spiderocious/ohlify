import type { PoolClient } from 'pg';

import { queueProDashboardInvalidation } from '@features/professionals/pro-dashboard.cache.js';
import { pool } from '@lib/db/pool.js';
import { id as makeId } from '@lib/ids.js';

import type { DurationSource } from '@features/call-session-events/duration.js';
import type { CallType } from '@features/bookings/bookings.types.js';

import {
  InstantCallStatus,
  LIVE_INSTANT_CALL_STATUSES,
  type InstantCallRow,
} from './instant-calls.types.js';

interface QueryRunner {
  query: PoolClient['query'];
}

export const create = async (
  runner: QueryRunner,
  input: {
    callerUserId: string;
    calleeUserId: string;
    callType: CallType;
    perMinuteKobo: bigint;
    secondsAllotted: number;
  },
): Promise<InstantCallRow> => {
  const callId = makeId('ic');
  const channel = `ic_${callId}`;
  const res = await runner.query<InstantCallRow>(
    `INSERT INTO instant_calls
       (id, caller_user_id, callee_user_id, call_type, agora_channel_name,
        per_minute_kobo, seconds_allotted, caller_joined_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, now())
     RETURNING *`,
    [
      callId,
      input.callerUserId,
      input.calleeUserId,
      input.callType,
      channel,
      input.perMinuteKobo.toString(),
      input.secondsAllotted,
    ],
  );
  return res.rows[0]!;
};

/**
 * Records a call that never rang — the professional was offline, not
 * accepting, or in a DnD block when someone tried to reach them.
 *
 * Written terminal: `rejected` never transitions, is never billed, and
 * settles nothing. It exists so the attempt appears in both parties' history
 * and the professional can be told someone tried.
 *
 * No participant rows and no `agora_channel_name` use: nothing ever joins.
 * `seconds_allotted` is 0 and `per_minute_kobo` records the rate that WOULD
 * have applied, which is what makes the row readable later.
 */
export const createRejectedAttempt = async (
  runner: QueryRunner,
  input: {
    callerUserId: string;
    calleeUserId: string;
    callType: CallType;
    perMinuteKobo: bigint;
    rejectionReason: string;
  },
): Promise<InstantCallRow> => {
  const callId = makeId('ic');
  const res = await runner.query<InstantCallRow>(
    `INSERT INTO instant_calls
       (id, caller_user_id, callee_user_id, call_type, agora_channel_name,
        per_minute_kobo, seconds_allotted, status, rejection_reason, ended_at)
     VALUES ($1, $2, $3, $4, $5, $6, 0, 'rejected', $7, now())
     RETURNING *`,
    [
      callId,
      input.callerUserId,
      input.calleeUserId,
      input.callType,
      `ic_${callId}`,
      input.perMinuteKobo.toString(),
      input.rejectionReason,
    ],
  );
  return res.rows[0]!;
};

export const findById = async (callId: string): Promise<InstantCallRow | null> => {
  const res = await pool.query<InstantCallRow>(
    `SELECT * FROM instant_calls WHERE id = $1 LIMIT 1`,
    [callId],
  );
  return res.rows[0] ?? null;
};

export const findByIdForUpdate = async (
  runner: QueryRunner,
  callId: string,
): Promise<InstantCallRow | null> => {
  const res = await runner.query<InstantCallRow>(
    `SELECT * FROM instant_calls WHERE id = $1 LIMIT 1 FOR UPDATE`,
    [callId],
  );
  return res.rows[0] ?? null;
};

/**
 * A user's instant-call history, either side of the call.
 *
 * `/calls/history` cannot serve these: it INNER JOINs `bookings`, so it only
 * ever returns scheduled calls. Instant calls — including `rejected` attempts
 * that never rang — have no booking and were invisible everywhere.
 *
 * Keyset on `(created_at, id)` rather than an offset so a call arriving
 * mid-scroll cannot shift rows out from under the reader.
 */
export const listHistoryForUser = async (input: {
  userId: string;
  limit: number;
  cursor?: { last_id: string; last_sort_key: string };
}): Promise<InstantCallRow[]> => {
  const params: unknown[] = [input.userId];
  let keyset = '';
  if (input.cursor) {
    params.push(input.cursor.last_sort_key, input.cursor.last_id);
    keyset = `AND (created_at, id) < ($${params.length - 1}::timestamptz, $${params.length})`;
  }
  params.push(input.limit);
  const res = await pool.query<InstantCallRow>(
    `SELECT * FROM instant_calls
      WHERE (caller_user_id = $1 OR callee_user_id = $1)
        ${keyset}
      ORDER BY created_at DESC, id DESC
      LIMIT $${params.length}`,
    params,
  );
  return res.rows;
};

// The callee's currently-live (ringing/active) instant call, if any. Powers the
// "you have an incoming call" poll while the app is open (foreground).
export const findLiveForCallee = async (calleeUserId: string): Promise<InstantCallRow | null> => {
  const res = await pool.query<InstantCallRow>(
    `SELECT * FROM instant_calls
      WHERE callee_user_id = $1 AND status = ANY($2::instant_call_status[])
      ORDER BY created_at DESC LIMIT 1`,
    [calleeUserId, LIVE_INSTANT_CALL_STATUSES],
  );
  return res.rows[0] ?? null;
};

// Ringing calls whose ring window has elapsed — the ring-timeout cron
// resolves these as missed. Claimed with SKIP LOCKED so parallel worker
// instances never double-resolve a row.
export const findExpiredRinging = async (
  runner: QueryRunner,
  ringSeconds: number,
  limit: number,
): Promise<InstantCallRow[]> => {
  const res = await runner.query<InstantCallRow>(
    `SELECT * FROM instant_calls
      WHERE status = '${InstantCallStatus.RINGING}'
        AND created_at < now() - ($1 * INTERVAL '1 second')
      ORDER BY created_at ASC
      LIMIT $2
      FOR UPDATE SKIP LOCKED`,
    [ringSeconds, limit],
  );
  return res.rows;
};

// Active calls that outlived their allotment plus grace — nobody sent the
// `end` that should have closed them (both apps killed, network gone). Left
// alone they pin the one-live-call-per-callee index open and the professional
// can never be called again, so the resolver settles them for the time the
// event log says was actually talked.
export const findStaleActive = async (
  runner: QueryRunner,
  graceSeconds: number,
  limit: number,
): Promise<InstantCallRow[]> => {
  const res = await runner.query<InstantCallRow>(
    `SELECT * FROM instant_calls
      WHERE status = '${InstantCallStatus.ACTIVE}'
        AND connected_at IS NOT NULL
        AND connected_at < now()
          - ((seconds_allotted + $1) * INTERVAL '1 second')
      ORDER BY connected_at ASC
      LIMIT $2
      FOR UPDATE SKIP LOCKED`,
    [graceSeconds, limit],
  );
  return res.rows;
};

/**
 * Every live call this user is the callee of, locked.
 *
 * Returns a LIST, not one row: the one-live-call unique index was dropped
 * (migration 0104), so nothing structurally prevents more than one any more.
 * `FOR UPDATE` because the caller is about to settle them.
 */
export const findLiveForCalleeAll = async (
  runner: QueryRunner,
  calleeUserId: string,
): Promise<InstantCallRow[]> => {
  const res = await runner.query<InstantCallRow>(
    `SELECT * FROM instant_calls
      WHERE callee_user_id = $1 AND status = ANY($2::instant_call_status[])
      ORDER BY created_at ASC
      FOR UPDATE`,
    [calleeUserId, LIVE_INSTANT_CALL_STATUSES],
  );
  return res.rows;
};

/**
 * Closes a call that never connected. Nothing was talked, so nothing is
 * billed and no settlement journal is written.
 */
export const markCancelled = async (
  runner: QueryRunner,
  callId: string,
): Promise<void> => {
  await runner.query(
    `UPDATE instant_calls
        SET status = '${InstantCallStatus.CANCELLED}',
            ended_at = now(),
            updated_at = now()
      WHERE id = $1`,
    [callId],
  );
};

export const markActive = async (runner: QueryRunner, callId: string): Promise<void> => {
  await runner.query(
    `UPDATE instant_calls
        SET status = '${InstantCallStatus.ACTIVE}',
            callee_joined_at = COALESCE(callee_joined_at, now()),
            connected_at = COALESCE(connected_at, now()),
            updated_at = now()
      WHERE id = $1`,
    [callId],
  );
};

export const finalize = async (
  runner: QueryRunner,
  input: {
    callId: string;
    status: InstantCallStatus;
    connectedSeconds: number;
    settledKobo: bigint;
    settlementJournalId: string | null;
    clientReportedSeconds?: number;
    durationSource?: DurationSource;
  },
): Promise<void> => {
  await runner.query(
    `UPDATE instant_calls
        SET status = $2,
            connected_seconds = $3,
            settled_kobo = $4::bigint,
            settlement_journal_id = $5,
            client_reported_seconds = COALESCE($6, client_reported_seconds),
            duration_source = COALESCE($7, duration_source),
            ended_at = now(),
            updated_at = now()
      WHERE id = $1`,
    [
      input.callId,
      input.status,
      input.connectedSeconds,
      input.settledKobo.toString(),
      input.settlementJournalId,
      input.clientReportedSeconds ?? null,
      input.durationSource ?? null,
    ],
  );

  // Every seat is released here because `finalize` is the one place every
  // ending path converges — hangup, timeout, stale-resolver. A participant left
  // occupying a seat would be treated as busy and could never take another call.
  await runner.query(
    `UPDATE call_participants
        SET status = 'left', left_at = COALESCE(left_at, now()), updated_at = now()
      WHERE call_id = $1
        AND status IN ('pending_approval', 'ringing', 'joined')`,
    [input.callId],
  );

  // The professional's dashboard counts missed calls and lists recent ones, so
  // every ending moves a figure on it.
  //
  // Hooked here rather than at each caller for the same reason the seats are
  // released here: `finalize` is where hangup, decline, ring-timeout and the
  // stale-resolver all converge. A missed call in particular posts no journal —
  // nobody was charged — so the money-path invalidation would never see it.
  const call = await runner.query<{ caller_user_id: string; callee_user_id: string }>(
    `SELECT caller_user_id, callee_user_id FROM instant_calls WHERE id = $1`,
    [input.callId],
  );
  const row = call.rows[0];
  if (row) {
    queueProDashboardInvalidation(runner, row.callee_user_id);
    queueProDashboardInvalidation(runner, row.caller_user_id);
  }
};
