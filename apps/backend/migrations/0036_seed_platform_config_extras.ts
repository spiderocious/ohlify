import type { MigrationBuilder } from 'node-pg-migrate';

// Adds the keys the wallet engine + support endpoints need at runtime. These
// were missing from migration 0016. Public-safe keys (is_public=TRUE) become
// part of GET /config/public; everything else is admin-only.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    INSERT INTO platform_config (key, value, is_public) VALUES
      -- Support contact channels (surface via GET /help/contact)
      ('support.email',                       '"support@ohlify.com"',          TRUE),
      ('support.whatsapp_number',             '"+2348000000000"',              TRUE),
      ('support.whatsapp_deeplink',           '"https://wa.me/2348000000000"', TRUE),
      -- Wallet / withdrawal policy
      ('wallet.withdrawal_cooldown_seconds',  '60',                            TRUE),
      ('wallet.max_withdrawals_per_day',      '5',                             TRUE),
      ('wallet.min_funding_kobo',             '50000',                         TRUE),
      ('wallet.max_funding_kobo',             '100000000',                     TRUE)
    ON CONFLICT (key) DO NOTHING
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    DELETE FROM platform_config WHERE key IN (
      'support.email',
      'support.whatsapp_number',
      'support.whatsapp_deeplink',
      'wallet.withdrawal_cooldown_seconds',
      'wallet.max_withdrawals_per_day',
      'wallet.min_funding_kobo',
      'wallet.max_funding_kobo'
    )
  `);
};
