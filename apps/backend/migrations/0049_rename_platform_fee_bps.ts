import type { MigrationBuilder } from 'node-pg-migrate';

// QA found the platform fee key was seeded as `platform.fee_bps` in
// migration 0016 but documented (and conceptually owned by) the wallet
// namespace as `wallet.platform_fee_bps`. The runtime code reads the right
// row today via an explicit key literal in platform-config.service.ts, but
// the docs + admin tuning UI (§21) expect `wallet.platform_fee_bps`. This
// migration renames the key in place: copy value across, delete the old
// row. Idempotent — safe to re-run after partial failure.
//
// Code in platform-config.service.ts is updated alongside this migration to
// read from the new key.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    INSERT INTO platform_config (key, value, is_public)
    SELECT 'wallet.platform_fee_bps', value, is_public
      FROM platform_config
     WHERE key = 'platform.fee_bps'
    ON CONFLICT (key) DO NOTHING
  `);
  // Insert default if neither key existed (defensive; the upsert above
  // copies if old exists, so this only fires on a wholly fresh DB that
  // somehow skipped 0016 — shouldn't happen but cheap insurance).
  pgm.sql(`
    INSERT INTO platform_config (key, value, is_public)
    VALUES ('wallet.platform_fee_bps', '1500', FALSE)
    ON CONFLICT (key) DO NOTHING
  `);
  pgm.sql(`DELETE FROM platform_config WHERE key = 'platform.fee_bps'`);
};

export const down = (pgm: MigrationBuilder): void => {
  // Restore the old key so the migration is symmetric in isolation.
  pgm.sql(`
    INSERT INTO platform_config (key, value, is_public)
    SELECT 'platform.fee_bps', value, is_public
      FROM platform_config
     WHERE key = 'wallet.platform_fee_bps'
    ON CONFLICT (key) DO NOTHING
  `);
  pgm.sql(`DELETE FROM platform_config WHERE key = 'wallet.platform_fee_bps'`);
};
