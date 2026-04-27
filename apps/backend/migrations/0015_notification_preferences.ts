import type { MigrationBuilder } from 'node-pg-migrate';

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TABLE notification_preferences (
      user_id          TEXT PRIMARY KEY REFERENCES users(id),
      sms_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
      sms_updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      email_enabled    BOOLEAN NOT NULL DEFAULT TRUE,
      email_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      push_enabled     BOOLEAN NOT NULL DEFAULT TRUE,
      push_updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql('DROP TABLE IF EXISTS notification_preferences');
};
