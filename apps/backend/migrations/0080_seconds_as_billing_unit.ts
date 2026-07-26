import type { MigrationBuilder } from 'node-pg-migrate';

// Revamp-2 Phase 1 — seconds become the internal billing unit. See docs/revamp-2/prd.md §1.1.
//
// Billing is per-second, so storing balances in whole minutes forced a rounding
// on every settlement and left part-minutes either unbilled or double-charged.
// The rate stays quoted per minute — that is the unit professionals set and
// users read — only the balance and the allotment move to seconds.
//
// Backfill is exact: existing whole-minute balances multiply cleanly by 60, so
// nobody gains or loses time in the conversion.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    ALTER TABLE minute_balances
      RENAME COLUMN minutes_remaining TO seconds_remaining
  `);
  pgm.sql(`UPDATE minute_balances SET seconds_remaining = seconds_remaining * 60`);
  pgm.sql(`
    ALTER TABLE minute_balances
      RENAME CONSTRAINT minute_balances_minutes_remaining_check
        TO minute_balances_seconds_remaining_check
  `);

  pgm.sql(`
    ALTER TABLE minute_purchases
      RENAME COLUMN minutes_purchased TO seconds_purchased
  `);
  pgm.sql(`UPDATE minute_purchases SET seconds_purchased = seconds_purchased * 60`);
  pgm.sql(`
    ALTER TABLE minute_purchases
      RENAME CONSTRAINT minute_purchases_minutes_purchased_check
        TO minute_purchases_seconds_purchased_check
  `);

  pgm.sql(`
    ALTER TABLE instant_calls
      RENAME COLUMN minutes_allotted TO seconds_allotted
  `);
  pgm.sql(`UPDATE instant_calls SET seconds_allotted = seconds_allotted * 60`);
  pgm.sql(`
    ALTER TABLE instant_calls
      RENAME CONSTRAINT instant_calls_minutes_allotted_check
        TO instant_calls_seconds_allotted_check
  `);

  // Every connected second is now billable. The old 30s grace existed because
  // sub-minute time could not be charged at all; per-second billing removes the
  // reason for it.
  pgm.sql(`
    UPDATE platform_config SET value = '1'::jsonb
      WHERE key = 'wallet.min_billable_seconds'
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    UPDATE platform_config SET value = '30'::jsonb
      WHERE key = 'wallet.min_billable_seconds'
  `);

  // Round up on the way back: a caller holding 90s keeps 2 minutes rather than
  // losing the part-minute they paid for.
  pgm.sql(`
    ALTER TABLE instant_calls
      RENAME CONSTRAINT instant_calls_seconds_allotted_check
        TO instant_calls_minutes_allotted_check
  `);
  pgm.sql(`UPDATE instant_calls SET seconds_allotted = CEIL(seconds_allotted::numeric / 60)`);
  pgm.sql(`ALTER TABLE instant_calls RENAME COLUMN seconds_allotted TO minutes_allotted`);

  pgm.sql(`
    ALTER TABLE minute_purchases
      RENAME CONSTRAINT minute_purchases_seconds_purchased_check
        TO minute_purchases_minutes_purchased_check
  `);
  pgm.sql(`UPDATE minute_purchases SET seconds_purchased = CEIL(seconds_purchased::numeric / 60)`);
  pgm.sql(`ALTER TABLE minute_purchases RENAME COLUMN seconds_purchased TO minutes_purchased`);

  pgm.sql(`
    ALTER TABLE minute_balances
      RENAME CONSTRAINT minute_balances_seconds_remaining_check
        TO minute_balances_minutes_remaining_check
  `);
  pgm.sql(`UPDATE minute_balances SET seconds_remaining = CEIL(seconds_remaining::numeric / 60)`);
  pgm.sql(`ALTER TABLE minute_balances RENAME COLUMN seconds_remaining TO minutes_remaining`);
};
