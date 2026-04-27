import crypto from 'node:crypto';

import { pool } from '@lib/db/pool.js';
import { logger } from '@lib/logger.js';

// Polls the outbox table and "publishes" events. In Slice A there are no real
// consumers — the worker simply marks rows published and logs them. Slice B
// wires email / push / websocket fanout into the switch below.
//
// Concurrency-safe: SELECT ... FOR UPDATE SKIP LOCKED lets multiple worker
// instances run in parallel without claiming the same row twice. Crash-safe:
// rows we claim but fail to publish stay unclaimed (FOR UPDATE releases on
// rollback) so the next poll retries them.

const POLL_INTERVAL_MS = 500;
const BATCH_SIZE = 50;
const MAX_ATTEMPTS = 8;

interface OutboxRow {
  id: string;
  aggregate_type: string;
  aggregate_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  attempt_count: number;
}

const publishOne = (row: OutboxRow): Promise<void> => {
  // Slice A: log only. Slice B replaces this switch with real fanout.
  logger.info(
    {
      outboxId: row.id,
      aggregateType: row.aggregate_type,
      aggregateId: row.aggregate_id,
      eventType: row.event_type,
    },
    'outbox event published (slice A — no consumers wired yet)',
  );
  return Promise.resolve();
};

const tickOnce = async (): Promise<void> => {
  let client;
  try {
    client = await pool.connect();
  } catch (err) {
    logger.warn({ err }, 'outbox worker pool.connect failed; retry next tick');
    return;
  }
  try {
    await client.query('BEGIN');
    const claimed = await client.query<OutboxRow>(
      `SELECT id, aggregate_type, aggregate_id, event_type, payload, attempt_count
         FROM outbox
        WHERE published_at IS NULL AND available_at <= now()
        ORDER BY available_at ASC
        LIMIT ${BATCH_SIZE}
        FOR UPDATE SKIP LOCKED`,
    );

    for (const row of claimed.rows) {
      try {
        await publishOne(row);
        await client.query(
          `UPDATE outbox SET published_at = now(), last_error = NULL WHERE id = $1`,
          [row.id],
        );
      } catch (err) {
        const next = row.attempt_count + 1;
        // Exponential backoff with jitter: min(2^n × 250ms + jitter, 30s).
        // Math.random is fine — this is a backoff jitter, not a security
        // primitive. (sonar pseudo-random rule false positive.)
        const jitter = crypto.randomInt(0, 250);
        const backoffMs = Math.min(2 ** Math.min(next, 10) * 250 + jitter, 30_000);
        const message = err instanceof Error ? err.message : String(err);
        const targetStatus = next >= MAX_ATTEMPTS ? `permanent: ${message}` : message;
        await client.query(
          `UPDATE outbox
              SET attempt_count = $2,
                  last_error    = $3,
                  available_at  = now() + ($4 * INTERVAL '1 millisecond')
            WHERE id = $1`,
          [row.id, next, targetStatus, backoffMs],
        );
      }
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.warn({ err }, 'outbox worker tick failed');
  } finally {
    client.release();
  }
};

interface OutboxWorkerHandle {
  stop: () => Promise<void>;
}

export const startOutboxWorker = (): OutboxWorkerHandle => {
  let stopped = false;
  let timer: NodeJS.Timeout | null = null;

  const loop = async (): Promise<void> => {
    if (stopped) return;
    try {
      await tickOnce();
    } catch (err) {
      logger.warn({ err }, 'outbox worker loop iteration crashed; continuing');
    }
    if (!stopped) {
      timer = setTimeout(() => {
        void loop();
      }, POLL_INTERVAL_MS);
      timer.unref();
    }
  };

  void loop();
  logger.info({ pollMs: POLL_INTERVAL_MS, batch: BATCH_SIZE }, 'outbox worker started');

  return {
    stop: () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      return Promise.resolve();
    },
  };
};
