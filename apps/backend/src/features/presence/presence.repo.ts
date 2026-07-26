import { pool } from '@lib/db/pool.js';

export interface PresenceRow {
  id: string;
  role: string;
  status: string;
  kyc_status: string;
  is_available: boolean;
  last_seen_at: Date | null;
}

export const findPresence = async (userId: string): Promise<PresenceRow | null> => {
  const res = await pool.query<PresenceRow>(
    `SELECT id, role, status::text AS status, kyc_status::text AS kyc_status,
            is_available, last_seen_at
       FROM users
      WHERE id = $1 AND deleted_at IS NULL
      LIMIT 1`,
    [userId],
  );
  return res.rows[0] ?? null;
};
