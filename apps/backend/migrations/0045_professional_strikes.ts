import type { MigrationBuilder } from 'node-pg-migrate';

// Strikes against a professional. Issued by the call resolution path on
// no-show / late-cancel / mid-call-quit (each independently configurable).
// Pro can dispute within strike_dispute_window_days; admin reviews.
//
// Lifecycle:
//   active → disputed → upheld | voided
//   active → voided  (admin manual void without dispute)
//
// upheld + active count toward auto-ban threshold (strikes_before_ban).
// disputed + voided do not.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TABLE professional_strikes (
      id                       TEXT PRIMARY KEY,
      professional_user_id     TEXT NOT NULL REFERENCES users(id),
      related_call_id          TEXT REFERENCES calls(id),
      related_booking_id       TEXT REFERENCES bookings(id),
      reason_code              strike_reason NOT NULL,
      description              TEXT,
      status                   strike_status NOT NULL DEFAULT 'active',
      dispute_comment          TEXT,
      disputed_at              TIMESTAMPTZ,
      admin_review_comment     TEXT,
      reviewed_by_admin_id     TEXT,
      reviewed_at              TIMESTAMPTZ,
      created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(
    `CREATE INDEX professional_strikes_pro_idx
       ON professional_strikes (professional_user_id, created_at DESC)`,
  );
  pgm.sql(
    `CREATE INDEX professional_strikes_status_idx
       ON professional_strikes (status, created_at DESC)`,
  );
  // One strike per (call, reason) — the same call can't double-strike for
  // the same reason. Different reasons on the same call are possible
  // (e.g. mid-call-quit + late-cancel theoretically — though they'd be
  // mutually exclusive in practice).
  pgm.sql(
    `CREATE UNIQUE INDEX professional_strikes_one_per_call_reason_idx
       ON professional_strikes (related_call_id, reason_code)
      WHERE related_call_id IS NOT NULL`,
  );
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DROP TABLE IF EXISTS professional_strikes`);
};
