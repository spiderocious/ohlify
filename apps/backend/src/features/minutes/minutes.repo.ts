import type { PoolClient } from 'pg';

import { pool } from '@lib/db/pool.js';
import { id as makeId } from '@lib/ids.js';

import type { CallType } from '@features/bookings/bookings.types.js';

import type { MinuteBalanceRow, MinutePurchaseRow } from './minutes.types.js';

interface QueryRunner {
  query: PoolClient['query'];
}

export const listBalancesForUser = async (userId: string): Promise<MinuteBalanceRow[]> => {
  const res = await pool.query<MinuteBalanceRow>(
    `SELECT * FROM minute_balances
      WHERE user_id = $1 AND minutes_remaining > 0
      ORDER BY updated_at DESC`,
    [userId],
  );
  return res.rows;
};

export const findBalance = async (
  userId: string,
  professionalId: string,
  callType: CallType,
): Promise<MinuteBalanceRow | null> => {
  const res = await pool.query<MinuteBalanceRow>(
    `SELECT * FROM minute_balances
      WHERE user_id = $1 AND professional_id = $2 AND call_type = $3
      LIMIT 1`,
    [userId, professionalId, callType],
  );
  return res.rows[0] ?? null;
};

// Locks the balance row for the (user, pro, call_type) inside a tx. Returns null
// if it doesn't exist yet (caller inserts).
export const findBalanceForUpdate = async (
  runner: QueryRunner,
  userId: string,
  professionalId: string,
  callType: CallType,
): Promise<MinuteBalanceRow | null> => {
  const res = await runner.query<MinuteBalanceRow>(
    `SELECT * FROM minute_balances
      WHERE user_id = $1 AND professional_id = $2 AND call_type = $3
      LIMIT 1 FOR UPDATE`,
    [userId, professionalId, callType],
  );
  return res.rows[0] ?? null;
};

// Adds minutes + escrow to a balance, re-snapshotting the per-minute rate to the
// most recent purchase price. Upserts on the unique (user, pro, call_type).
export const addMinutes = async (
  runner: QueryRunner,
  input: {
    userId: string;
    professionalId: string;
    callType: CallType;
    minutes: number;
    perMinuteKobo: bigint;
    amountKobo: bigint;
  },
): Promise<MinuteBalanceRow> => {
  const res = await runner.query<MinuteBalanceRow>(
    `INSERT INTO minute_balances
       (id, user_id, professional_id, call_type, minutes_remaining, rate_snapshot_kobo, escrow_kobo)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id, professional_id, call_type)
     DO UPDATE SET
       minutes_remaining = minute_balances.minutes_remaining + EXCLUDED.minutes_remaining,
       escrow_kobo       = minute_balances.escrow_kobo + EXCLUDED.escrow_kobo,
       rate_snapshot_kobo = EXCLUDED.rate_snapshot_kobo,
       updated_at        = now()
     RETURNING *`,
    [
      makeId('mb'),
      input.userId,
      input.professionalId,
      input.callType,
      input.minutes,
      input.perMinuteKobo.toString(),
      input.amountKobo.toString(),
    ],
  );
  return res.rows[0]!;
};

// Deducts consumed minutes + escrow from a balance after a call settles.
// Clamps at zero (defensive; the caller computes the exact consumption).
export const consumeMinutes = async (
  runner: QueryRunner,
  input: {
    userId: string;
    professionalId: string;
    callType: CallType;
    minutes: number;
    escrowKobo: bigint;
  },
): Promise<void> => {
  await runner.query(
    `UPDATE minute_balances
        SET minutes_remaining = GREATEST(minutes_remaining - $4, 0),
            escrow_kobo       = GREATEST(escrow_kobo - $5::bigint, 0),
            updated_at        = now()
      WHERE user_id = $1 AND professional_id = $2 AND call_type = $3`,
    [
      input.userId,
      input.professionalId,
      input.callType,
      input.minutes,
      input.escrowKobo.toString(),
    ],
  );
};

export const insertPurchase = async (
  runner: QueryRunner,
  input: {
    purchaseId: string;
    userId: string;
    professionalId: string;
    callType: CallType;
    amountKobo: bigint;
    perMinuteKobo: bigint;
    minutes: number;
    journalId: string | null;
  },
): Promise<MinutePurchaseRow> => {
  const res = await runner.query<MinutePurchaseRow>(
    `INSERT INTO minute_purchases
       (id, user_id, professional_id, call_type, amount_kobo, per_minute_kobo, minutes_purchased, journal_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      input.purchaseId,
      input.userId,
      input.professionalId,
      input.callType,
      input.amountKobo.toString(),
      input.perMinuteKobo.toString(),
      input.minutes,
      input.journalId,
    ],
  );
  return res.rows[0]!;
};
