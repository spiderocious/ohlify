import type { MigrationBuilder } from 'node-pg-migrate';

// Seed platform_config keys for the Calls + Bookings + Strikes slice. All
// admin-tunable; defaults match the architecture doc §8. Public-safe values
// (call type definitions, billable seconds, cancel window) are exposed via
// GET /config/public so mobile can render policy text without a separate
// endpoint.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    INSERT INTO platform_config (key, value, is_public) VALUES
      -- Wallet / fee mode
      ('wallet.fee_mode',                          '"deduct_from_payee"',  TRUE),
      ('wallet.min_billable_seconds',              '30',                   TRUE),
      ('wallet.caller_no_show_refund_pct_bps',     '2000',                 FALSE),
      ('wallet.caller_no_show_payee_pct_bps',      '8000',                 FALSE),

      -- Bookings / call lifecycle
      ('bookings.no_show_grace_seconds',           '300',                  TRUE),
      ('bookings.cancel_window_minutes',           '60',                   TRUE),
      ('bookings.inside_window_penalty_bps',       '3000',                 TRUE),
      ('bookings.network_flap_window_seconds',     '60',                   FALSE),
      ('bookings.token_expires_seconds',           '3600',                 FALSE),

      -- Strike triggers (each independently toggleable)
      ('professional.strike_on_no_show',           'true',                 FALSE),
      ('professional.strike_on_late_cancel',       'true',                 FALSE),
      ('professional.strike_on_mid_call_quit',     'true',                 FALSE),
      ('professional.strikes_before_ban',          '3',                    TRUE),
      ('professional.strike_dispute_window_days',  '14',                   TRUE)
    ON CONFLICT (key) DO NOTHING
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    DELETE FROM platform_config WHERE key IN (
      'wallet.fee_mode',
      'wallet.min_billable_seconds',
      'wallet.caller_no_show_refund_pct_bps',
      'wallet.caller_no_show_payee_pct_bps',
      'bookings.no_show_grace_seconds',
      'bookings.cancel_window_minutes',
      'bookings.inside_window_penalty_bps',
      'bookings.network_flap_window_seconds',
      'bookings.token_expires_seconds',
      'professional.strike_on_no_show',
      'professional.strike_on_late_cancel',
      'professional.strike_on_mid_call_quit',
      'professional.strikes_before_ban',
      'professional.strike_dispute_window_days'
    )
  `);
};
