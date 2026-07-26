import type { MigrationBuilder } from 'node-pg-migrate';

// Phase 0 config keys. Seeded here (not only as compiled-in defaults) so they
// show up in the admin config editor on every existing environment — a key
// that lives solely in DEFAULT_SNAPSHOT is invisible to operators, which is
// what happened to presence.ring_timeout_seconds before 0077.
//
// Values mirror DEFAULT_SNAPSHOT exactly. ON CONFLICT DO NOTHING keeps a
// re-run from clobbering an operator's tuning.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    INSERT INTO platform_config (key, value, is_public) VALUES
      ('bookings.stale_active_grace_seconds', '120'::jsonb, FALSE),
      ('wallet.funding_fee_mode', '"pass_on"'::jsonb, TRUE),
      ('wallet.funding_fee_bps', '150'::jsonb, TRUE),
      ('wallet.funding_fee_flat_kobo', '10000'::jsonb, TRUE),
      ('wallet.funding_fee_cap_kobo', '200000'::jsonb, TRUE),
      ('wallet.withdrawal_fee_mode', '"absorb"'::jsonb, FALSE),
      ('wallet.withdrawal_fee_flat_kobo', '5000'::jsonb, FALSE)
    ON CONFLICT (key) DO NOTHING
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    DELETE FROM platform_config WHERE key IN (
      'bookings.stale_active_grace_seconds',
      'wallet.funding_fee_mode',
      'wallet.funding_fee_bps',
      'wallet.funding_fee_flat_kobo',
      'wallet.funding_fee_cap_kobo',
      'wallet.withdrawal_fee_mode',
      'wallet.withdrawal_fee_flat_kobo'
    )
  `);
};
