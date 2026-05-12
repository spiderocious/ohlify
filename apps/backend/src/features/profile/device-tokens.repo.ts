import { pool } from '@lib/db/pool.js';

export interface DeviceTokenRow {
  token: string;
  user_id: string;
  platform: 'ios' | 'android' | 'web';
  app_version: string | null;
  created_at: Date;
  last_seen_at: Date;
}

/**
 * Idempotent upsert. Same token can arrive multiple times (silent
 * re-registration on app startup); same token from a different user
 * means a phone changed hands (or an account switch) — the token moves
 * to the new owner. `last_seen_at` is always bumped on touch.
 */
export const upsert = async (input: {
  token: string;
  userId: string;
  platform: 'ios' | 'android' | 'web';
  appVersion?: string;
}): Promise<DeviceTokenRow> => {
  const res = await pool.query<DeviceTokenRow>(
    `INSERT INTO device_tokens (token, user_id, platform, app_version)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (token) DO UPDATE
       SET user_id     = EXCLUDED.user_id,
           platform    = EXCLUDED.platform,
           app_version = COALESCE(EXCLUDED.app_version, device_tokens.app_version),
           last_seen_at = now()
     RETURNING *`,
    [input.token, input.userId, input.platform, input.appVersion ?? null],
  );
  return res.rows[0]!;
};

export const deleteForUser = async (
  userId: string,
  token: string,
): Promise<void> => {
  await pool.query(
    `DELETE FROM device_tokens WHERE user_id = $1 AND token = $2`,
    [userId, token],
  );
};

/**
 * Used by the outbox push adapter to fan out to every device the user
 * is currently active on.
 */
export const findActiveTokensForUser = async (
  userId: string,
): Promise<DeviceTokenRow[]> => {
  const res = await pool.query<DeviceTokenRow>(
    `SELECT * FROM device_tokens WHERE user_id = $1 ORDER BY last_seen_at DESC`,
    [userId],
  );
  return res.rows;
};

/**
 * Called by the push adapter when FCM responds with "token not
 * registered" — the device uninstalled the app, or the token rotated.
 * Best-effort cleanup; no transactional guarantees needed.
 */
export const deleteByToken = async (token: string): Promise<void> => {
  await pool.query(`DELETE FROM device_tokens WHERE token = $1`, [token]);
};
