import type { MigrationBuilder } from 'node-pg-migrate';

// Revamp-2 Phase 2 — platform-wide capability switches. See docs/revamp-2/prd.md §2.1.
//
// Seeded rather than left to compiled-in defaults so they appear in the admin
// config editor everywhere. A switch an operator cannot find is a switch that
// does not exist when they need it at 2am.
//
// All default TRUE: an environment that never touches them behaves exactly as
// it did before. `enablement.message` is public because the app shows it in
// place of whatever the user was trying to do.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    INSERT INTO platform_config (key, value, is_public) VALUES
      ('enablement.login', 'true'::jsonb, TRUE),
      ('enablement.registration', 'true'::jsonb, TRUE),
      ('enablement.wallet_funding', 'true'::jsonb, TRUE),
      ('enablement.withdrawals', 'true'::jsonb, TRUE),
      ('enablement.calls', 'true'::jsonb, TRUE),
      ('enablement.chat', 'true'::jsonb, TRUE),
      ('enablement.minutes_purchase', 'true'::jsonb, TRUE),
      ('enablement.message',
        '"This is temporarily unavailable while we carry out maintenance. Please try again shortly."'::jsonb,
        TRUE)
    ON CONFLICT (key) DO NOTHING
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DELETE FROM platform_config WHERE key LIKE 'enablement.%'`);
};
