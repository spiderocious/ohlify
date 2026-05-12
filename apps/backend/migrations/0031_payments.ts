import type { MigrationBuilder } from 'node-pg-migrate';

// Payment records — created when initiating a Paystack charge (wallet funding
// or, later, a §8 call payment). One row per attempt initiation. Status walks
// pending → success | failed; success can later move to refunded /
// partially_refunded. Source of truth for "did this charge land?" is the
// Paystack webhook; this row is updated when the webhook arrives.
//
// Per db-schema.md §3.9 with the wallet-first adjustment: `call_id` is now
// nullable since funding-only payments don't relate to a call.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TYPE payment_purpose AS ENUM (
      'wallet_funding',
      'call_payment'
    )
  `);

  pgm.sql(`
    CREATE TABLE payments (
      id                    TEXT PRIMARY KEY,
      reference             TEXT UNIQUE NOT NULL,
      paystack_reference    TEXT UNIQUE,
      purpose               payment_purpose NOT NULL,
      user_id               TEXT NOT NULL REFERENCES users(id),
      call_id               TEXT,
      amount_kobo           BIGINT NOT NULL CHECK (amount_kobo > 0),
      currency              TEXT NOT NULL DEFAULT 'NGN',
      status                payment_status NOT NULL DEFAULT 'pending',
      authorization_url     TEXT,
      access_code           TEXT,
      channel               TEXT,
      paid_at               TIMESTAMPTZ,
      failed_reason         TEXT,
      paystack_fees_kobo    BIGINT,
      raw_paystack_payload  JSONB,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(`CREATE INDEX payments_user_idx ON payments (user_id, created_at DESC)`);
  pgm.sql(`CREATE INDEX payments_status_idx ON payments (status, created_at DESC)`);
  pgm.sql(`CREATE INDEX payments_purpose_idx ON payments (purpose)`);
  pgm.sql(
    `CREATE INDEX payments_call_idx ON payments (call_id) WHERE call_id IS NOT NULL`,
  );
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DROP TABLE IF EXISTS payments`);
  pgm.sql(`DROP TYPE IF EXISTS payment_purpose`);
};
