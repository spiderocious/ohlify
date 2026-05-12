import type { MigrationBuilder } from 'node-pg-migrate';

// Durable mirror of the Redis idempotency cache (per correctness.md §5).
// Two-tier: Redis is hot (24h TTL, primary read), Postgres is durable
// (7-day GC). When Redis evicts, the middleware falls back to this table.
//
// Composite PK (scope, route, key) matches the cache key shape:
//   idem:{user_id|guest_id|ip}:{route}:{key}
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TABLE idempotency_keys (
      key             TEXT NOT NULL,
      scope           TEXT NOT NULL,
      route           TEXT NOT NULL,
      request_hash    TEXT NOT NULL,
      response_status INT NOT NULL,
      response_body   JSONB NOT NULL,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (scope, route, key)
    )
  `);

  pgm.sql(`CREATE INDEX idempotency_keys_created_idx ON idempotency_keys (created_at)`);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DROP TABLE IF EXISTS idempotency_keys`);
};
