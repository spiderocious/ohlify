import type { MigrationBuilder } from 'node-pg-migrate';

// Calls — an actual session derived from a confirmed booking. Created at
// booking-confirm time so the call_id is stable for Agora channel naming.
// Sits in `scheduled` until start_at; then a cron flips it to
// waiting_for_parties; join/leave + Agora webhook drive it to a terminal
// state.
//
// agora_channel_name is denormalized (= 'call_' || id) for indexing on the
// webhook side. UNIQUE so two calls can never collide.
//
// connected_seconds = max overlap of caller + callee join intervals.
// Computed at settlement time and stored.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TABLE calls (
      id                        TEXT PRIMARY KEY,
      booking_id                TEXT NOT NULL UNIQUE REFERENCES bookings(id),
      status                    call_status NOT NULL DEFAULT 'scheduled',
      agora_channel_name        TEXT NOT NULL UNIQUE,
      caller_joined_at          TIMESTAMPTZ,
      callee_joined_at          TIMESTAMPTZ,
      caller_left_at            TIMESTAMPTZ,
      callee_left_at            TIMESTAMPTZ,
      connected_seconds         INT NOT NULL DEFAULT 0 CHECK (connected_seconds >= 0),
      settlement_journal_id     TEXT REFERENCES journal_entries(id),
      refund_journal_id         TEXT REFERENCES journal_entries(id),
      ended_at                  TIMESTAMPTZ,
      created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(`CREATE INDEX calls_status_idx ON calls (status)`);
  pgm.sql(
    `CREATE INDEX calls_status_pending_resolution_idx
       ON calls (status, updated_at)
      WHERE status IN ('waiting_for_parties', 'in_progress')`,
  );
  pgm.sql(`CREATE INDEX calls_booking_idx ON calls (booking_id)`);

  // Now that calls exists, add the FK from journal_entries.related_call_id
  // (which has been a free-text column since 0027). Defer the constraint to
  // not break existing rows.
  pgm.sql(`
    ALTER TABLE journal_entries
      ADD CONSTRAINT journal_entries_call_fk
      FOREIGN KEY (related_call_id) REFERENCES calls(id)
      DEFERRABLE INITIALLY DEFERRED
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`ALTER TABLE journal_entries DROP CONSTRAINT IF EXISTS journal_entries_call_fk`);
  pgm.sql(`DROP TABLE IF EXISTS calls`);
};
