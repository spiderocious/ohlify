import type { MigrationBuilder } from 'node-pg-migrate';

// User reports — primary use case is reporting a review (offensive,
// fraudulent, etc.), but the schema is generic so we can extend to
// reporting profiles or messages later.
//
// status flow: pending -> resolved | dismissed.
//   - resolved: admin took action (e.g. hid the review).
//   - dismissed: admin reviewed and decided no action needed.
//
// Partial unique index prevents the same user from spamming reports
// against the same target while one is still pending.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`CREATE TYPE report_status AS ENUM ('pending', 'resolved', 'dismissed')`);
  pgm.sql(`CREATE TYPE report_target_type AS ENUM ('review', 'profile', 'message')`);

  pgm.sql(`
    CREATE TABLE reports (
      id                TEXT PRIMARY KEY,
      reporter_user_id  TEXT NOT NULL REFERENCES users(id),
      target_type       report_target_type NOT NULL,
      target_id         TEXT NOT NULL,
      reason_code       TEXT NOT NULL,
      description       TEXT,
      status            report_status NOT NULL DEFAULT 'pending',
      reviewed_by       TEXT REFERENCES admin_users(id),
      reviewed_at       TIMESTAMPTZ,
      review_note       TEXT,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  pgm.sql(`CREATE INDEX reports_target_idx ON reports (target_type, target_id, created_at DESC)`);
  pgm.sql(`CREATE INDEX reports_status_idx ON reports (status, created_at) WHERE status = 'pending'`);
  pgm.sql(`CREATE INDEX reports_reporter_idx ON reports (reporter_user_id, created_at DESC)`);
  pgm.sql(`
    CREATE UNIQUE INDEX reports_unique_pending_idx
      ON reports (reporter_user_id, target_type, target_id)
      WHERE status = 'pending'
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql('DROP TABLE IF EXISTS reports');
  pgm.sql('DROP TYPE IF EXISTS report_target_type');
  pgm.sql('DROP TYPE IF EXISTS report_status');
};
