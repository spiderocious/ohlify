import type { MigrationBuilder } from 'node-pg-migrate';

// Calls revamp — Phase 4 (instant calls). See docs/revamp/phases.md.
//
// An instant call is created directly from a caller's minutes balance with a
// professional — NO booking, NO slot. It's isolated from the scheduled-call
// `calls` table (which stays intact + revivable) so the two models don't
// interfere. Minutes are metered per second while connected and settled from
// the minutes_escrow to the pro at end.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TYPE instant_call_status AS ENUM (
      'ringing',      -- created; waiting for the pro to pick up
      'active',       -- both parties connected; minutes burning
      'ended',        -- completed normally (settled)
      'missed',       -- pro never answered within the ring window (no charge)
      'cancelled'     -- caller hung up before the pro answered (no charge)
    )
  `);

  pgm.sql(`
    CREATE TABLE instant_calls (
      id                    TEXT PRIMARY KEY,
      caller_user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      callee_user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      call_type             call_type NOT NULL,
      status                instant_call_status NOT NULL DEFAULT 'ringing',
      agora_channel_name    TEXT NOT NULL UNIQUE,
      -- Snapshot of the per-minute price (kobo) charged for this call.
      per_minute_kobo       BIGINT NOT NULL CHECK (per_minute_kobo > 0),
      -- Minutes the caller held with this pro at start (the hard cap).
      minutes_allotted      INT NOT NULL CHECK (minutes_allotted > 0),
      connected_seconds     INT NOT NULL DEFAULT 0 CHECK (connected_seconds >= 0),
      -- Amount settled to the pro from escrow at end (kobo).
      settled_kobo          BIGINT NOT NULL DEFAULT 0 CHECK (settled_kobo >= 0),
      settlement_journal_id TEXT REFERENCES journal_entries(id),
      caller_joined_at      TIMESTAMPTZ,
      callee_joined_at      TIMESTAMPTZ,
      connected_at          TIMESTAMPTZ,
      ended_at              TIMESTAMPTZ,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(`CREATE INDEX instant_calls_caller_idx ON instant_calls (caller_user_id, created_at DESC)`);
  pgm.sql(`CREATE INDEX instant_calls_callee_idx ON instant_calls (callee_user_id, created_at DESC)`);
  // At most one live (ringing/active) call per callee at a time.
  pgm.sql(`
    CREATE UNIQUE INDEX instant_calls_one_live_per_callee
      ON instant_calls (callee_user_id)
      WHERE status IN ('ringing', 'active')
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DROP TABLE IF EXISTS instant_calls`);
  pgm.sql(`DROP TYPE IF EXISTS instant_call_status`);
};
