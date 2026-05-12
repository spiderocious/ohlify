import type { PoolClient } from 'pg';

import { pool } from '@lib/db/pool.js';
import { id } from '@lib/ids.js';

export interface BookingBlockRow {
  id: string;
  user_id: string;
  start_minute: number;
  end_minute: number;
  created_at: Date;
}

export const listForUser = async (userId: string): Promise<BookingBlockRow[]> => {
  const res = await pool.query<BookingBlockRow>(
    `SELECT id, user_id, start_minute, end_minute, created_at
       FROM professional_booking_blocks
      WHERE user_id = $1
      ORDER BY start_minute ASC, end_minute ASC`,
    [userId],
  );
  return res.rows;
};

/**
 * Replaces every block for [userId] with [blocks] inside a single
 * transaction. Saves are full-list overwrites (PUT semantics) — simpler
 * than per-row CRUD and the list never gets long enough to make this
 * costly. Generates fresh ids; existing ids aren't preserved across
 * saves because clients identify rows by their (start, end) tuple.
 */
export const replaceAll = async (
  userId: string,
  blocks: ReadonlyArray<{ start_minute: number; end_minute: number }>,
): Promise<BookingBlockRow[]> => {
  const client: PoolClient = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `DELETE FROM professional_booking_blocks WHERE user_id = $1`,
      [userId],
    );
    for (const b of blocks) {
      await client.query(
        `INSERT INTO professional_booking_blocks (id, user_id, start_minute, end_minute)
         VALUES ($1, $2, $3, $4)`,
        [id('blk'), userId, b.start_minute, b.end_minute],
      );
    }
    const res = await client.query<BookingBlockRow>(
      `SELECT id, user_id, start_minute, end_minute, created_at
         FROM professional_booking_blocks
        WHERE user_id = $1
        ORDER BY start_minute ASC, end_minute ASC`,
      [userId],
    );
    await client.query('COMMIT');
    return res.rows;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
};
