import type { PoolClient } from 'pg';

import { pool } from '@lib/db/pool.js';
import { id as makeId } from '@lib/ids.js';

import type { BookingRow, BookingStatus, CallType, FeeMode } from './bookings.types.js';

interface QueryRunner {
  query: PoolClient['query'];
}

export interface CreateBookingInput {
  callerUserId: string;
  calleeUserId: string;
  rateId: string;
  callType: CallType;
  startAt: Date;
  durationMinutes: number;
  totalPaidKobo: bigint;
  payeeAmountKobo: bigint;
  platformFeeKobo: bigint;
  feeModeUsed: FeeMode;
  idempotencyKey: string | null;
}

export const create = async (
  runner: QueryRunner,
  input: CreateBookingInput,
): Promise<BookingRow> => {
  const res = await runner.query<BookingRow>(
    `INSERT INTO bookings (
       id, caller_user_id, callee_user_id, rate_id, call_type, start_at,
       duration_minutes, total_paid_kobo, payee_amount_kobo, platform_fee_kobo,
       fee_mode_used, idempotency_key
     )
     VALUES ($1, $2, $3, $4, $5::call_type, $6, $7, $8, $9, $10, $11::fee_mode, $12)
     RETURNING *`,
    [
      makeId('bk'),
      input.callerUserId,
      input.calleeUserId,
      input.rateId,
      input.callType,
      input.startAt,
      input.durationMinutes,
      input.totalPaidKobo.toString(),
      input.payeeAmountKobo.toString(),
      input.platformFeeKobo.toString(),
      input.feeModeUsed,
      input.idempotencyKey,
    ],
  );
  return res.rows[0]!;
};

export const setReservationJournalAndConfirm = async (
  runner: QueryRunner,
  bookingId: string,
  journalId: string,
): Promise<void> => {
  await runner.query(
    `UPDATE bookings
        SET status = 'confirmed',
            reservation_journal_id = $2,
            updated_at = now()
      WHERE id = $1 AND status = 'pending'`,
    [bookingId, journalId],
  );
};

export const findById = async (bookingId: string): Promise<BookingRow | null> => {
  const res = await pool.query<BookingRow>(`SELECT * FROM bookings WHERE id = $1 LIMIT 1`, [
    bookingId,
  ]);
  return res.rows[0] ?? null;
};

export const findByIdForUpdate = async (
  runner: QueryRunner,
  bookingId: string,
): Promise<BookingRow | null> => {
  const res = await runner.query<BookingRow>(
    `SELECT * FROM bookings WHERE id = $1 LIMIT 1 FOR UPDATE`,
    [bookingId],
  );
  return res.rows[0] ?? null;
};

export const findByIdempotencyKey = async (
  callerUserId: string,
  idempotencyKey: string,
): Promise<BookingRow | null> => {
  const res = await pool.query<BookingRow>(
    `SELECT * FROM bookings WHERE caller_user_id = $1 AND idempotency_key = $2 LIMIT 1`,
    [callerUserId, idempotencyKey],
  );
  return res.rows[0] ?? null;
};

interface ListInput {
  userId: string;
  role: 'caller' | 'callee' | 'either';
  limit: number;
  cursor?: { last_id: string; last_sort_key: string };
  status?: BookingStatus;
}

export const listForUser = async (input: ListInput): Promise<BookingRow[]> => {
  const params: unknown[] = [];
  const filters: string[] = [];

  if (input.role === 'caller') {
    params.push(input.userId);
    filters.push(`caller_user_id = $${params.length}`);
  } else if (input.role === 'callee') {
    params.push(input.userId);
    filters.push(`callee_user_id = $${params.length}`);
  } else {
    params.push(input.userId);
    params.push(input.userId);
    filters.push(`(caller_user_id = $${params.length - 1} OR callee_user_id = $${params.length})`);
  }

  if (input.status !== undefined) {
    params.push(input.status);
    filters.push(`status = $${params.length}::booking_status`);
  }
  if (input.cursor !== undefined) {
    params.push(input.cursor.last_sort_key);
    params.push(input.cursor.last_id);
    filters.push(
      `(start_at < $${params.length - 1}::timestamptz OR (start_at = $${params.length - 1}::timestamptz AND id < $${params.length}))`,
    );
  }
  params.push(input.limit + 1);

  const res = await pool.query<BookingRow>(
    `SELECT * FROM bookings
       WHERE ${filters.join(' AND ')}
       ORDER BY start_at DESC, id DESC
       LIMIT $${params.length}`,
    params,
  );
  return res.rows;
};

export const setCancelled = async (
  runner: QueryRunner,
  bookingId: string,
  status: 'cancelled_outside_window' | 'cancelled_inside_window',
  cancelledByUserId: string,
): Promise<void> => {
  await runner.query(
    `UPDATE bookings
        SET status = $2::booking_status,
            cancelled_at = now(),
            cancelled_by_user_id = $3,
            updated_at = now()
      WHERE id = $1`,
    [bookingId, status, cancelledByUserId],
  );
};

export const setFulfilled = async (runner: QueryRunner, bookingId: string): Promise<void> => {
  await runner.query(`UPDATE bookings SET status = 'fulfilled', updated_at = now() WHERE id = $1`, [
    bookingId,
  ]);
};

// Used by the availability endpoint to mask out slots that already overlap a
// pending or confirmed booking on the callee. Returns the minimum shape we
// need to compute slot conflicts (start_at + duration_minutes). Excludes
// cancelled / fulfilled rows — only live future commitments matter for slot
// blocking.
export const findBookingsInWindow = async (
  calleeUserId: string,
  fromUtc: Date,
  toUtcExclusive: Date,
): Promise<Array<{ start_at: Date; duration_minutes: number }>> => {
  const res = await pool.query<{ start_at: Date; duration_minutes: number }>(
    `SELECT start_at, duration_minutes
       FROM bookings
      WHERE callee_user_id = $1
        AND status IN ('pending','confirmed')
        AND start_at < $3
        AND (start_at + (duration_minutes * INTERVAL '1 minute')) > $2`,
    [calleeUserId, fromUtc, toUtcExclusive],
  );
  return res.rows;
};

// Conflict check: callee can't have an overlapping confirmed booking.
//
// MUST run inside the booking-creation tx with FOR UPDATE so two concurrent
// requests serialize on the matching rows. The DB-level
// `bookings_no_overlap` GiST exclusion constraint (migration 0048) is the
// airtight backstop — even if two inserts somehow both pass this check, the
// second commit fails with a 23P01 exclusion_violation. Running this check
// inside the tx lets us return a friendly 409 instead of bubbling that
// constraint error to the user.
export const findOverlappingConfirmedForCallee = async (
  runner: QueryRunner,
  calleeUserId: string,
  startAt: Date,
  durationMinutes: number,
): Promise<BookingRow | null> => {
  const endAt = new Date(startAt.getTime() + durationMinutes * 60_000);
  const res = await runner.query<BookingRow>(
    `SELECT * FROM bookings
      WHERE callee_user_id = $1
        AND status IN ('pending','confirmed')
        AND start_at < $3
        AND (start_at + (duration_minutes * INTERVAL '1 minute')) > $2
      LIMIT 1
      FOR UPDATE`,
    [calleeUserId, startAt, endAt],
  );
  return res.rows[0] ?? null;
};
