import type { MigrationBuilder } from 'node-pg-migrate';

// Bookings — an intent to call a professional at time T. Created via
// POST /bookings; the wallet money is reserved synchronously into
// pending_debits_pool. Snapshots fee_mode + amounts at booking time so a
// platform_config flip mid-flight doesn't retroactively re-split.
//
// total_paid_kobo = payee_amount_kobo + platform_fee_kobo (always).
//
// Lifecycle:
//   pending → confirmed (synchronous after wallet.pay succeeds)
//   confirmed → cancelled_outside_window | cancelled_inside_window | fulfilled
//
// Cancellation paths refund per platform_config policy. Fulfilled is the
// terminal state once the matching call row resolves.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TABLE bookings (
      id                        TEXT PRIMARY KEY,
      caller_user_id            TEXT NOT NULL REFERENCES users(id),
      callee_user_id            TEXT NOT NULL REFERENCES users(id),
      rate_id                   TEXT NOT NULL REFERENCES professional_rates(id),
      call_type                 call_type NOT NULL,
      start_at                  TIMESTAMPTZ NOT NULL,
      duration_minutes          INT NOT NULL CHECK (duration_minutes > 0),
      status                    booking_status NOT NULL DEFAULT 'pending',
      total_paid_kobo           BIGINT NOT NULL CHECK (total_paid_kobo > 0),
      payee_amount_kobo         BIGINT NOT NULL CHECK (payee_amount_kobo >= 0),
      platform_fee_kobo         BIGINT NOT NULL CHECK (platform_fee_kobo >= 0),
      fee_mode_used             fee_mode NOT NULL,
      reservation_journal_id    TEXT REFERENCES journal_entries(id),
      idempotency_key           TEXT,
      cancelled_at              TIMESTAMPTZ,
      cancelled_by_user_id      TEXT REFERENCES users(id),
      created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
      CHECK (total_paid_kobo = payee_amount_kobo + platform_fee_kobo),
      CHECK (caller_user_id <> callee_user_id)
    )
  `);

  pgm.sql(`CREATE INDEX bookings_caller_idx ON bookings (caller_user_id, start_at DESC)`);
  pgm.sql(`CREATE INDEX bookings_callee_idx ON bookings (callee_user_id, start_at DESC)`);
  pgm.sql(`CREATE INDEX bookings_status_start_idx ON bookings (status, start_at)`);
  // Per-user idempotency on the client-supplied key. Two NULLs are distinct.
  pgm.sql(
    `CREATE UNIQUE INDEX bookings_caller_idem_idx
       ON bookings (caller_user_id, idempotency_key)
      WHERE idempotency_key IS NOT NULL`,
  );

  // Backfill the FK from journal_entries.related_call_id once calls table
  // exists (migration 0043 handles that). Bookings reservation journals point
  // at journal_entries directly; nothing to FK back here.
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DROP TABLE IF EXISTS bookings`);
};
