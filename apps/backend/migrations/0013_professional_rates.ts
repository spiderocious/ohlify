import type { MigrationBuilder } from 'node-pg-migrate';

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TABLE professional_rates (
      id                TEXT PRIMARY KEY,
      user_id           TEXT NOT NULL REFERENCES users(id),
      call_type         call_type NOT NULL,
      duration_minutes  INT NOT NULL,
      price_kobo        BIGINT NOT NULL CHECK (price_kobo > 0),
      currency          TEXT NOT NULL DEFAULT 'NGN',
      created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at        TIMESTAMPTZ,
      UNIQUE (user_id, call_type, duration_minutes)
    )
  `);

  pgm.sql(
    `CREATE INDEX professional_rates_user_idx ON professional_rates (user_id) WHERE deleted_at IS NULL`,
  );
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql('DROP TABLE IF EXISTS professional_rates');
};
