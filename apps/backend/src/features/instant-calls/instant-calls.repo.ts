import type { PoolClient } from 'pg';

import { pool } from '@lib/db/pool.js';
import { id as makeId } from '@lib/ids.js';

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
    minutesAllotted: number;
  },
): Promise<InstantCallRow> => {
  const callId = makeId('ic');
  const channel = `ic_${callId}`;
  const res = await runner.query<InstantCallRow>(
    `INSERT INTO instant_calls
       (id, caller_user_id, callee_user_id, call_type, agora_channel_name,
        per_minute_kobo, minutes_allotted, caller_joined_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, now())
     RETURNING *`,
    [
      callId,
      input.callerUserId,
      input.calleeUserId,
      input.callType,
      channel,
      input.perMinuteKobo.toString(),
      input.minutesAllotted,
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
  },
): Promise<void> => {
  await runner.query(
    `UPDATE instant_calls
        SET status = $2,
            connected_seconds = $3,
            settled_kobo = $4::bigint,
            settlement_journal_id = $5,
            ended_at = now(),
            updated_at = now()
      WHERE id = $1`,
    [
      input.callId,
      input.status,
      input.connectedSeconds,
      input.settledKobo.toString(),
      input.settlementJournalId,
    ],
  );
};
