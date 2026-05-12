import type { PoolClient } from 'pg';

import { pool } from '@lib/db/pool.js';
import { id } from '@lib/ids.js';

interface QueryRunner {
  query: PoolClient['query'];
}

export interface InsertWebhookInput {
  eventId: string;
  eventType: string;
  signature: string;
  rawBody: unknown;
}

// Inserts a paystack_webhooks row if and only if the event_id is new. Returns
// `inserted: true` for first delivery, `false` for a duplicate (the processor
// then exits as a no-op).
export const insertIfAbsent = async (
  runner: QueryRunner,
  input: InsertWebhookInput,
): Promise<{ inserted: boolean; webhookId: string | null }> => {
  const webhookId = id('pwh');
  const res = await runner.query<{ id: string }>(
    `INSERT INTO paystack_webhooks (id, event_id, event_type, signature, raw_body)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     ON CONFLICT (event_id) DO NOTHING
     RETURNING id`,
    [webhookId, input.eventId, input.eventType, input.signature, JSON.stringify(input.rawBody)],
  );
  if (!res.rows[0]) {
    return { inserted: false, webhookId: null };
  }
  return { inserted: true, webhookId: res.rows[0].id };
};

export const markProcessed = async (
  runner: QueryRunner,
  webhookId: string,
  error: string | null,
): Promise<void> => {
  await runner.query(
    `UPDATE paystack_webhooks
        SET processed_at = now(),
            processing_error = $2
      WHERE id = $1`,
    [webhookId, error],
  );
};

export interface WebhookEnvelopeRow {
  id: string;
  event_id: string;
  event_type: string;
  signature: string | null;
  raw_body: unknown;
  received_at: Date;
  processed_at: Date | null;
  processing_error: string | null;
  replay_count: number;
}

export const findById = async (webhookId: string): Promise<WebhookEnvelopeRow | null> => {
  const res = await pool.query<WebhookEnvelopeRow>(
    `SELECT * FROM paystack_webhooks WHERE id = $1 LIMIT 1`,
    [webhookId],
  );
  return res.rows[0] ?? null;
};

// Bumps replay_count and clears processed_at so a replay treats the row as
// fresh. The processWebhook path uses the event_id UNIQUE collision to dedupe,
// so re-processing the same envelope still posts no duplicate journals.
export const markReplayed = async (webhookId: string): Promise<void> => {
  await pool.query(
    `UPDATE paystack_webhooks
        SET replay_count = replay_count + 1,
            processed_at = NULL,
            processing_error = NULL
      WHERE id = $1`,
    [webhookId],
  );
};
