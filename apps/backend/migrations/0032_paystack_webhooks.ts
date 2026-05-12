import type { MigrationBuilder } from 'node-pg-migrate';

// Exactly-once webhook envelope storage. event_id UNIQUE — if Paystack
// re-delivers, the second insert fails and the processor exits as a no-op.
// Raw body and signature are preserved indefinitely for forensic replay
// (admin re-fire endpoint lands in §21).
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TABLE paystack_webhooks (
      id                TEXT PRIMARY KEY,
      event_id          TEXT UNIQUE NOT NULL,
      event_type        TEXT NOT NULL,
      signature         TEXT NOT NULL,
      raw_body          JSONB NOT NULL,
      received_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
      processed_at      TIMESTAMPTZ,
      processing_error  TEXT,
      replay_count      INT NOT NULL DEFAULT 0,
      last_replayed_by  TEXT,
      last_replayed_at  TIMESTAMPTZ
    )
  `);

  pgm.sql(`CREATE INDEX paystack_webhooks_type_idx ON paystack_webhooks (event_type, received_at DESC)`);
  pgm.sql(
    `CREATE INDEX paystack_webhooks_unprocessed_idx ON paystack_webhooks (received_at) WHERE processed_at IS NULL`,
  );
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DROP TABLE IF EXISTS paystack_webhooks`);
};
