import type { PoolClient } from 'pg';

import { id } from '@lib/ids.js';

import type { OutboxAggregateType, OutboxEventType } from './events.js';

export interface InsertEventInput {
  aggregateType: OutboxAggregateType;
  aggregateId: string;
  eventType: OutboxEventType;
  payload: Record<string, unknown>;
  availableAt?: Date;
}

interface QueryRunner {
  query: PoolClient['query'];
}

// Inserts an outbox event row inside an existing tx. Side-effects bound to a
// business write MUST go through this helper so they only fire iff the tx
// commits. The outbox worker (next file) polls and fans out.
export const insertEvent = async (
  runner: QueryRunner,
  input: InsertEventInput,
): Promise<{ id: string }> => {
  const eventId = id('out');
  await runner.query(
    `INSERT INTO outbox (
       id, aggregate_type, aggregate_id, event_type, payload, available_at
     ) VALUES ($1, $2, $3, $4, $5::jsonb, COALESCE($6, now()))`,
    [
      eventId,
      input.aggregateType,
      input.aggregateId,
      input.eventType,
      JSON.stringify(input.payload),
      input.availableAt ?? null,
    ],
  );
  return { id: eventId };
};
