import type { MigrationBuilder } from 'node-pg-migrate';

// Transactional outbox per correctness.md §1. Side-effects bound to a write
// (email, push, websocket) are inserted into this table inside the same tx
// that does the business write. The outbox worker polls and fans out using
// SELECT ... FOR UPDATE SKIP LOCKED so multiple worker instances run safely
// in parallel.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TABLE outbox (
      id              TEXT PRIMARY KEY,
      aggregate_type  TEXT NOT NULL,
      aggregate_id    TEXT NOT NULL,
      event_type      TEXT NOT NULL,
      payload         JSONB NOT NULL,
      available_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      published_at    TIMESTAMPTZ,
      attempt_count   INT NOT NULL DEFAULT 0,
      last_error      TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(
    `CREATE INDEX outbox_unpublished_idx ON outbox (available_at) WHERE published_at IS NULL`,
  );
  pgm.sql(`CREATE INDEX outbox_aggregate_idx ON outbox (aggregate_type, aggregate_id)`);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DROP TABLE IF EXISTS outbox`);
};
