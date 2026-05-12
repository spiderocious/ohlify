import type { MigrationBuilder } from 'node-pg-migrate';

// Refund requests — a generic feature for users to request a refund on any
// platform spend. Slice B targets call payments (the only spend that exists
// in the engine), but the schema doesn't bake call_id in: any spend that
// produced a journal can be refunded by admin approval.
//
// target_journal_id points at the journal whose entry against the requester's
// wallet is being refunded (a call_payment_reserve or call_settlement journal
// in slice B).
//
// related_call_id is captured for call refunds; future product refunds will
// add their own ref column. NULL is fine in slice B if someone refunds a
// non-call spend.
//
// refund_journal_id is the journal posted when the refund was actually
// approved/auto-approved (NULL until then).
//
// Lifecycle:
//   pending → approved | rejected
//   pending → auto_approved (server-side rule, e.g. cancel within window)
//
// approved/rejected/auto_approved are terminal. Admin approval posts the
// refund journal (call_refund or call_refund_post_settle depending on the
// state of the related journal).
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TYPE refund_request_status AS ENUM (
      'pending',
      'approved',
      'auto_approved',
      'rejected'
    )
  `);

  pgm.sql(`
    CREATE TABLE refund_requests (
      id                       TEXT PRIMARY KEY,
      requester_user_id        TEXT NOT NULL REFERENCES users(id),
      target_journal_id        TEXT NOT NULL REFERENCES journal_entries(id),
      related_call_id          TEXT,
      reason_code              TEXT NOT NULL,
      description              TEXT,
      requested_amount_kobo    BIGINT NOT NULL CHECK (requested_amount_kobo > 0),
      status                   refund_request_status NOT NULL DEFAULT 'pending',
      refund_journal_id        TEXT REFERENCES journal_entries(id),
      reviewed_by_admin_id     TEXT,
      reviewed_at              TIMESTAMPTZ,
      review_note              TEXT,
      created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(
    `CREATE INDEX refund_requests_requester_idx
       ON refund_requests (requester_user_id, created_at DESC)`,
  );
  pgm.sql(
    `CREATE INDEX refund_requests_status_idx
       ON refund_requests (status, created_at DESC)
      WHERE status = 'pending'`,
  );
  pgm.sql(
    `CREATE INDEX refund_requests_target_journal_idx
       ON refund_requests (target_journal_id)`,
  );
  // One open refund request per (requester, target_journal). Once approved or
  // rejected, the requester can re-request only if they have a different
  // target_journal — so the partial index covers only pending status.
  pgm.sql(
    `CREATE UNIQUE INDEX refund_requests_one_pending_per_journal_idx
       ON refund_requests (requester_user_id, target_journal_id)
      WHERE status = 'pending'`,
  );
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DROP TABLE IF EXISTS refund_requests`);
  pgm.sql(`DROP TYPE IF EXISTS refund_request_status`);
};
