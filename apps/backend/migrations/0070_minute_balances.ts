import type { MigrationBuilder } from 'node-pg-migrate';

// Calls revamp — Phase 2 (minutes wallet). See docs/revamp/phases.md.
//
// A user buys MINUTES against a specific professional, funded from their wallet.
// The money moves user_wallet -> minutes_escrow (a liability the platform holds
// on the user's behalf) and is settled to the pro per-minute AS THE CALL BURNS
// minutes (Phase 4). Minutes are per-(user, professional, call_type); the
// per-minute rate is SNAPSHOTTED at purchase so later rate changes don't move
// already-bought minutes.
export const up = (pgm: MigrationBuilder): void => {
  // 1. Escrow system account — prepaid minutes money held platform-side.
  pgm.sql(`
    INSERT INTO accounts (id, kind, owner_user_id, system_code, currency, label, is_active) VALUES
      ('acct_sys_minutes_escrow', 'liability', NULL, 'minutes_escrow',
        'NGN', 'Prepaid call-minutes held per user', TRUE)
    ON CONFLICT DO NOTHING
  `);

  // 2. Per-(user, professional, call_type) minutes balance.
  pgm.sql(`
    CREATE TABLE minute_balances (
      id                    TEXT PRIMARY KEY,
      user_id               TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      professional_id       TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      call_type             call_type NOT NULL,
      minutes_remaining     INT NOT NULL DEFAULT 0 CHECK (minutes_remaining >= 0),
      -- Per-minute price snapshotted at the most recent purchase (kobo).
      rate_snapshot_kobo    BIGINT NOT NULL CHECK (rate_snapshot_kobo > 0),
      -- Money currently held in escrow backing minutes_remaining (kobo).
      escrow_kobo           BIGINT NOT NULL DEFAULT 0 CHECK (escrow_kobo >= 0),
      created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // One balance row per (user, professional, call_type).
  pgm.sql(`
    CREATE UNIQUE INDEX minute_balances_uniq
      ON minute_balances (user_id, professional_id, call_type)
  `);
  pgm.sql(`CREATE INDEX minute_balances_user_idx ON minute_balances (user_id)`);
  pgm.sql(`CREATE INDEX minute_balances_pro_idx ON minute_balances (professional_id)`);

  // 3. Purchase history (audit + idempotency-adjacent record). One row per buy.
  pgm.sql(`
    CREATE TABLE minute_purchases (
      id                    TEXT PRIMARY KEY,
      user_id               TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      professional_id       TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      call_type             call_type NOT NULL,
      amount_kobo           BIGINT NOT NULL CHECK (amount_kobo > 0),
      per_minute_kobo       BIGINT NOT NULL CHECK (per_minute_kobo > 0),
      minutes_purchased     INT NOT NULL CHECK (minutes_purchased > 0),
      journal_id            TEXT,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  pgm.sql(`CREATE INDEX minute_purchases_user_idx ON minute_purchases (user_id, created_at DESC)`);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DROP TABLE IF EXISTS minute_purchases`);
  pgm.sql(`DROP TABLE IF EXISTS minute_balances`);
  pgm.sql(`DELETE FROM accounts WHERE system_code = 'minutes_escrow'`);
};
