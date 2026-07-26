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
      WHERE user_id = $1 AND seconds_remaining > 0
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

// Adds seconds + escrow to a balance, re-snapshotting the per-minute rate to the
// most recent purchase price. Upserts on the unique (user, pro, call_type).
export const addSeconds = async (
  runner: QueryRunner,
  input: {
    userId: string;
    professionalId: string;
    callType: CallType;
    seconds: number;
    perMinuteKobo: bigint;
    amountKobo: bigint;
  },
): Promise<MinuteBalanceRow> => {
  const res = await runner.query<MinuteBalanceRow>(
    `INSERT INTO minute_balances
       (id, user_id, professional_id, call_type, seconds_remaining, rate_snapshot_kobo, escrow_kobo)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id, professional_id, call_type)
     DO UPDATE SET
       seconds_remaining  = minute_balances.seconds_remaining + EXCLUDED.seconds_remaining,
       escrow_kobo        = minute_balances.escrow_kobo + EXCLUDED.escrow_kobo,
       rate_snapshot_kobo = EXCLUDED.rate_snapshot_kobo,
       updated_at         = now()
     RETURNING *`,
    [
      makeId('mb'),
      input.userId,
      input.professionalId,
      input.callType,
      input.seconds,
      input.perMinuteKobo.toString(),
      input.amountKobo.toString(),
    ],
  );
  return res.rows[0]!;
};

// Deducts consumed seconds + escrow from a balance after a call settles.
// Clamps at zero (defensive; the caller computes the exact consumption).
export const consumeSeconds = async (
  runner: QueryRunner,
  input: {
    userId: string;
    professionalId: string;
    callType: CallType;
    seconds: number;
    escrowKobo: bigint;
  },
): Promise<void> => {
  await runner.query(
    `UPDATE minute_balances
        SET seconds_remaining = GREATEST(seconds_remaining - $4, 0),
            escrow_kobo       = GREATEST(escrow_kobo - $5::bigint, 0),
            updated_at        = now()
      WHERE user_id = $1 AND professional_id = $2 AND call_type = $3`,
    [
      input.userId,
      input.professionalId,
      input.callType,
      input.seconds,
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
    seconds: number;
    journalId: string | null;
  },
): Promise<MinutePurchaseRow> => {
  const res = await runner.query<MinutePurchaseRow>(
    `INSERT INTO minute_purchases
       (id, user_id, professional_id, call_type, amount_kobo, per_minute_kobo, seconds_purchased, journal_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      input.purchaseId,
      input.userId,
      input.professionalId,
      input.callType,
      input.amountKobo.toString(),
      input.perMinuteKobo.toString(),
      input.seconds,
      input.journalId,
    ],
  );
  return res.rows[0]!;
};

export interface ActiveBalanceRow {
  professional_id: string;
  full_name: string | null;
  avatar_url: string | null;
  occupation: string | null;
  seconds_remaining: number;
  rate_snapshot_kobo: string;
  call_type: string;
  updated_at: Date;
}

/**
 * Professionals this user still holds time with, most recent first.
 *
 * Powers "continue where you left off" — the highest-intent surface a returning
 * client has, since they have already paid to talk to these people. Joins the
 * professional in so the card renders without a second round trip.
 */
export const listActiveBalancesWithPro = async (
  userId: string,
  limit: number,
): Promise<ActiveBalanceRow[]> => {
  const res = await pool.query<ActiveBalanceRow>(
    `SELECT mb.professional_id,
            u.full_name,
            u.avatar_url,
            u.occupation,
            mb.seconds_remaining,
            mb.rate_snapshot_kobo,
            mb.call_type::text AS call_type,
            mb.updated_at
       FROM minute_balances mb
       JOIN users u ON u.id = mb.professional_id AND u.deleted_at IS NULL
      WHERE mb.user_id = $1 AND mb.seconds_remaining > 0
      ORDER BY mb.updated_at DESC
      LIMIT $2`,
    [userId, limit],
  );
  return res.rows;
};
