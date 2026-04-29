import type { PoolClient } from 'pg';

import { pool } from '@lib/db/pool.js';
import { id as makeId } from '@lib/ids.js';

import type { CallEventRow, CallRow, CallStatus } from './calls.types.js';

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
