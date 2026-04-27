import type { MigrationBuilder } from 'node-pg-migrate';

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TABLE platform_config (
      key         TEXT PRIMARY KEY,
      value       JSONB NOT NULL,
      is_public   BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_by  TEXT REFERENCES admin_users(id)
    )
  `);

  pgm.sql(`
    INSERT INTO platform_config (key, value, is_public) VALUES
      ('auth.otp_ttl_seconds',                '600',                 TRUE),
      ('auth.otp_resend_seconds',             '60',                  TRUE),
      ('booking.cancel_window_minutes',       '10',                  TRUE),
      ('booking.reschedule_window_minutes',   '10',                  TRUE),
      ('booking.join_window_minutes',         '5',                   TRUE),
      ('booking.missed_call_grace_minutes',   '10',                  TRUE),
      ('booking.payment_hold_minutes',        '10',                  TRUE),
      ('rates.min_kobo',                      '50000',               TRUE),
      ('rates.max_kobo',                      '50000000',            TRUE),
      ('rates.allowed_durations_minutes',     '[5,10,15,20,25,30,45,60]', TRUE),
      ('wallet.min_withdrawal_kobo',          '100000',              TRUE),
      ('wallet.max_withdrawal_per_day_kobo',  '10000000',            TRUE),
      ('wallet.payout_mode',                  '"instant"',           FALSE),
      ('platform.fee_bps',                    '1500',                FALSE),
      ('kyc.auto_approve',                    'true',                FALSE),
      ('handle.change_cooldown_days',         '30',                  TRUE),
      ('handle.redirect_days',                '90',                  TRUE),
      ('features.public_web_booking',         'true',                TRUE),
      ('features.calendar_ics',               'true',                TRUE),
      ('features.banners_enabled',            'true',                TRUE)
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql('DROP TABLE IF EXISTS platform_config');
};
