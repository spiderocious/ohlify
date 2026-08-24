import type { PoolClient } from 'pg';

import { pool } from '@lib/db/pool.js';
import { id as makeId } from '@lib/ids.js';

import type { BadgeSurface, NotificationRow } from './notifications.types.js';

interface QueryRunner {
  query: PoolClient['query'];
}

export interface CreateNotificationInput {
  userId: string;
  kind: string;
  title: string;
  body?: string | null;
  deeplink?: string | null;
  metadata?: Record<string, unknown>;
  /**
   * The outbox row that produced this notification, when there is one.
   *
   * Makes the write idempotent: the outbox retries a failed dispatch, and
   * without this a partial failure leaves the user two identical notices.
   * Absent for rows a service writes directly (admin campaigns).
   */
  outboxId?: string | null;
}

/**
 * Inserts a notification, or returns null when one already exists for the same
 * outbox row.
 *
 * `ON CONFLICT DO NOTHING` rather than an existence check: two worker instances
 * can claim different outbox rows concurrently, so a check-then-insert would
 * still race. Null means "already delivered", which callers treat as success.
 */
export const create = async (
  runner: QueryRunner,
  input: CreateNotificationInput,
): Promise<NotificationRow | null> => {
  const res = await runner.query<NotificationRow>(
    `INSERT INTO notifications (id, user_id, kind, title, body, deeplink, metadata, outbox_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (outbox_id) WHERE outbox_id IS NOT NULL DO NOTHING
     RETURNING *`,
    [
      makeId('n'),
      input.userId,
      input.kind,
      input.title,
      input.body ?? null,
      input.deeplink ?? null,
      JSON.stringify(input.metadata ?? {}),
      input.outboxId ?? null,
    ],
  );
  // Empty on an idempotent no-op — the row already exists for this outbox event.
  return res.rows[0] ?? null;
};

/**
 * Newest-first page. Keyset on `(created_at, id)` rather than an offset so an
 * arriving notification cannot shift rows out from under a scrolling reader.
 */
export const listForUser = async (
  userId: string,
  limit: number,
  cursor?: { last_sort_key: string; last_id: string },
): Promise<NotificationRow[]> => {
  if (cursor) {
    const res = await pool.query<NotificationRow>(
      `SELECT * FROM notifications
        WHERE user_id = $1
          AND (created_at, id) < ($2::timestamptz, $3)
        ORDER BY created_at DESC, id DESC
        LIMIT $4`,
      [userId, cursor.last_sort_key, cursor.last_id, limit],
    );
    return res.rows;
  }
  const res = await pool.query<NotificationRow>(
    `SELECT * FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT $2`,
    [userId, limit],
  );
  return res.rows;
};

export const countUnread = async (userId: string): Promise<number> => {
  const res = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM notifications WHERE user_id = $1 AND read_at IS NULL`,
    [userId],
  );
  return Number(res.rows[0]?.count ?? 0);
};

/** Scoped by user_id as well as id so one user cannot mark another's row read. */
export const markRead = async (userId: string, notificationId: string): Promise<boolean> => {
  const res = await pool.query(
    `UPDATE notifications
        SET read_at = COALESCE(read_at, now())
      WHERE id = $1 AND user_id = $2`,
    [notificationId, userId],
  );
  return (res.rowCount ?? 0) > 0;
};

export const markAllRead = async (userId: string): Promise<number> => {
  const res = await pool.query(
    `UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL`,
    [userId],
  );
  return res.rowCount ?? 0;
};

// ── Surface watermarks ──────────────────────────────────────────────────────

export const touchSurfaceSeen = async (userId: string, surface: BadgeSurface): Promise<void> => {
  await pool.query(
    `INSERT INTO user_surface_seen (user_id, surface, seen_at)
     VALUES ($1, $2, now())
     ON CONFLICT (user_id, surface) DO UPDATE SET seen_at = now()`,
    [userId, surface],
  );
};

/**
 * Both dot surfaces in one round trip.
 *
 * A user who has never opened a surface has no watermark, so `to_timestamp(0)`
 * stands in — anything at all then counts as unseen, which is the right first
 * impression rather than a silently empty dot.
 */
export const readDotSurfaces = async (
  userId: string,
): Promise<{ callsUnseen: boolean; walletUnseen: boolean }> => {
  const res = await pool.query<{ calls_unseen: boolean; wallet_unseen: boolean }>(
    `WITH seen AS (
       SELECT surface, seen_at FROM user_surface_seen WHERE user_id = $1
     )
     SELECT
       EXISTS (
         SELECT 1 FROM instant_calls
          WHERE callee_user_id = $1
            AND created_at > COALESCE(
              (SELECT seen_at FROM seen WHERE surface = 'calls'), to_timestamp(0))
       ) AS calls_unseen,
       EXISTS (
         SELECT 1 FROM wallet_entries we
           JOIN accounts a ON a.id = we.account_id
          WHERE a.owner_user_id = $1
            AND we.created_at > COALESCE(
              (SELECT seen_at FROM seen WHERE surface = 'wallet'), to_timestamp(0))
       ) AS wallet_unseen`,
    [userId],
  );
  const row = res.rows[0];
  return {
    callsUnseen: row?.calls_unseen ?? false,
    walletUnseen: row?.wallet_unseen ?? false,
  };
};
