import type { PoolClient } from 'pg';

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
};
