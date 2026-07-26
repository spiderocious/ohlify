import type { PoolClient } from 'pg';

import { pool } from '@lib/db/pool.js';
import { id as makeId } from '@lib/ids.js';

import {
  IntentStatus,
  type IntentNeed,
  type IntentRequirement,
  type PurchaseIntentRow,
} from './intents.types.js';

interface QueryRunner {
  query: PoolClient['query'];
}

export const create = async (input: {
  userId: string;
  need: IntentNeed;
  requirement: IntentRequirement;
  ttlMinutes: number;
}): Promise<PurchaseIntentRow> => {
  const res = await pool.query<PurchaseIntentRow>(
    `INSERT INTO purchase_intents (id, user_id, need, requirement, expires_at)
     VALUES ($1, $2, $3, $4, now() + ($5 * INTERVAL '1 minute'))
     RETURNING *`,
    [makeId('pi'), input.userId, input.need, JSON.stringify(input.requirement), input.ttlMinutes],
  );
  return res.rows[0]!;
};

export const findById = async (intentId: string): Promise<PurchaseIntentRow | null> => {
  const res = await pool.query<PurchaseIntentRow>(
    `SELECT * FROM purchase_intents WHERE id = $1 LIMIT 1`,
    [intentId],
  );
  return res.rows[0] ?? null;
};

export const findByIdForUpdate = async (
  runner: QueryRunner,
  intentId: string,
): Promise<PurchaseIntentRow | null> => {
  const res = await runner.query<PurchaseIntentRow>(
    `SELECT * FROM purchase_intents WHERE id = $1 LIMIT 1 FOR UPDATE`,
    [intentId],
  );
  return res.rows[0] ?? null;
};

// Only ever moves a pending intent onward, so a re-verified satisfied intent
// keeps its original satisfied_at rather than drifting forward on each poll.
export const markStatus = async (
  runner: QueryRunner,
  intentId: string,
  status: IntentStatus,
): Promise<PurchaseIntentRow | null> => {
  // $2 is cast explicitly because it is read twice — once as the new enum
  // value and once in a text comparison. Without the cast Postgres tries to
  // deduce a single type for both and rejects the statement outright.
  const res = await runner.query<PurchaseIntentRow>(
    `UPDATE purchase_intents
        SET status       = $2::purchase_intent_status,
            satisfied_at = CASE WHEN $2 = '${IntentStatus.SATISFIED}'
                                THEN now() ELSE satisfied_at END,
            updated_at   = now()
      WHERE id = $1 AND status = '${IntentStatus.PENDING}'
      RETURNING *`,
    [intentId, status],
  );
  return res.rows[0] ?? null;
};

/** Retires pending intents past their window. Returns how many were swept. */
export const expireStale = async (limit: number): Promise<number> => {
  const res = await pool.query(
    `UPDATE purchase_intents
        SET status = '${IntentStatus.EXPIRED}', updated_at = now()
      WHERE id IN (
        SELECT id FROM purchase_intents
         WHERE status = '${IntentStatus.PENDING}' AND expires_at < now()
         ORDER BY expires_at ASC
         LIMIT $1
         FOR UPDATE SKIP LOCKED
      )`,
    [limit],
  );
  return res.rowCount ?? 0;
};
