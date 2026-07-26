import type { MigrationBuilder } from 'node-pg-migrate';

// Revamp-2 Phase 7 — manual-review withdrawals get a deadline. See docs/revamp-2/prd.md §7.1.
//
// A withdrawal parked for manual review has ALREADY debited the professional's
// wallet. Left unattended it is not a neutral wait — it is their money held
// indefinitely with no resolution. These two keys bound that wait.
//
// `on_timeout` defaults to `approve`: auto-rejecting would punish a
// professional for an admin's inattention, and rejection is the outcome that
// needs a human's reasoning behind it.
//
// Both are FALSE (private) — payout policy is operational, not something the
// apps read or should key behaviour off.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    INSERT INTO platform_config (key, value, is_public) VALUES
      ('wallet.auto_resolve_after_hours', '48'::jsonb, FALSE),
      ('wallet.on_timeout', '"approve"'::jsonb, FALSE)
    ON CONFLICT (key) DO NOTHING
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    DELETE FROM platform_config
     WHERE key IN ('wallet.auto_resolve_after_hours', 'wallet.on_timeout')
  `);
};
