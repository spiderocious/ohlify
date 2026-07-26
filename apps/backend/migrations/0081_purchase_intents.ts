import type { MigrationBuilder } from 'node-pg-migrate';

// Revamp-2 Phase 1 — purchase intents. See docs/revamp-2/prd.md §1.3.
//
// An intent records a CONDITION a user must clear before some blocked action
// can continue ("hold 60s with this pro", "have ₦5,000 spendable"). The client
// never reports that it satisfied one — it hands back the ref and the server
// re-evaluates against live balances, so an abandoned, failed, or forged flow
// simply never satisfies and the caller's guard holds.
//
// `requirement` is JSONB because the shape varies by `need` and new needs
// should not each cost a migration. Terminal statuses are never revisited.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TYPE purchase_intent_status AS ENUM (
      'pending',
      'satisfied',
      'expired',
      'cancelled'
    )
  `);

  pgm.sql(`
    CREATE TABLE purchase_intents (
      id            TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      need          TEXT NOT NULL CHECK (need IN ('minutes', 'wallet_balance')),
      requirement   JSONB NOT NULL,
      status        purchase_intent_status NOT NULL DEFAULT 'pending',
      satisfied_at  TIMESTAMPTZ,
      expires_at    TIMESTAMPTZ NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(`
    CREATE INDEX purchase_intents_user_idx
      ON purchase_intents (user_id, created_at DESC)
  `);
  // The expiry sweep only ever scans rows still in play.
  pgm.sql(`
    CREATE INDEX purchase_intents_pending_idx
      ON purchase_intents (expires_at)
      WHERE status = 'pending'
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql('DROP TABLE IF EXISTS purchase_intents');
  pgm.sql('DROP TYPE IF EXISTS purchase_intent_status');
};
