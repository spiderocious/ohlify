import { pool } from '@lib/db/pool.js';
import { id } from '@lib/ids.js';

import type { CallType, RateRow } from './rates.types.js';

export const findActiveByUser = async (userId: string): Promise<RateRow[]> => {
  const res = await pool.query<RateRow>(
    `SELECT * FROM professional_rates
      WHERE user_id = $1 AND deleted_at IS NULL
      ORDER BY call_type ASC, duration_minutes ASC`,
    [userId],
  );
  return res.rows;
};

export const findByIdForUser = async (rateId: string, userId: string): Promise<RateRow | null> => {
  const res = await pool.query<RateRow>(
    `SELECT * FROM professional_rates
      WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
      LIMIT 1`,
    [rateId, userId],
  );
  return res.rows[0] ?? null;
};

// One-active-rate-per-channel lookup for the single-rate model. Returns the
// pro's existing active rate for a call_type regardless of duration.
export const findActiveByUserAndCallType = async (
  userId: string,
  callType: CallType,
): Promise<RateRow | null> => {
  const res = await pool.query<RateRow>(
    `SELECT * FROM professional_rates
      WHERE user_id = $1
        AND call_type = $2
        AND deleted_at IS NULL
      LIMIT 1`,
    [userId, callType],
  );
  return res.rows[0] ?? null;
};

export const findActiveByUserAndShape = async (
  userId: string,
  callType: CallType,
  durationMinutes: number,
): Promise<RateRow | null> => {
  const res = await pool.query<RateRow>(
    `SELECT * FROM professional_rates
      WHERE user_id = $1
        AND call_type = $2
        AND duration_minutes = $3
        AND deleted_at IS NULL
      LIMIT 1`,
    [userId, callType, durationMinutes],
  );
  return res.rows[0] ?? null;
};

export const create = async (input: {
  userId: string;
  callType: CallType;
  durationMinutes: number;
  priceKobo: number;
}): Promise<RateRow> => {
  const res = await pool.query<RateRow>(
    `INSERT INTO professional_rates (id, user_id, call_type, duration_minutes, price_kobo)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [id('rate'), input.userId, input.callType, input.durationMinutes, input.priceKobo],
  );
  return res.rows[0]!;
};

export const update = async (
  rateId: string,
  userId: string,
  fields: { callType?: CallType; durationMinutes?: number; priceKobo?: number },
): Promise<RateRow | null> => {
  const sets: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (fields.callType !== undefined) {
    sets.push(`call_type = $${i++}`);
    params.push(fields.callType);
  }
  if (fields.durationMinutes !== undefined) {
    sets.push(`duration_minutes = $${i++}`);
    params.push(fields.durationMinutes);
  }
  if (fields.priceKobo !== undefined) {
    sets.push(`price_kobo = $${i++}`);
    params.push(fields.priceKobo);
  }
  if (sets.length === 0) {
    return findByIdForUser(rateId, userId);
  }
  params.push(rateId);
  params.push(userId);
  const res = await pool.query<RateRow>(
    `UPDATE professional_rates SET ${sets.join(', ')}
       WHERE id = $${i++} AND user_id = $${i} AND deleted_at IS NULL
       RETURNING *`,
    params,
  );
  return res.rows[0] ?? null;
};

export const softDelete = async (rateId: string, userId: string): Promise<boolean> => {
  const res = await pool.query(
    `UPDATE professional_rates SET deleted_at = now()
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
    [rateId, userId],
  );
  return (res.rowCount ?? 0) > 0;
};
