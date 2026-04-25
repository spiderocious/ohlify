import type { MigrationBuilder } from 'node-pg-migrate';

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TABLE banks (
      code       TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      logo_url   TEXT,
      is_active  BOOLEAN NOT NULL DEFAULT TRUE,
      synced_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql('DROP TABLE IF EXISTS banks');
};
