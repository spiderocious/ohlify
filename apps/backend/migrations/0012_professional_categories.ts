import type { MigrationBuilder } from 'node-pg-migrate';

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TABLE professional_categories (
      value      TEXT PRIMARY KEY,
      label      TEXT NOT NULL,
      icon_url   TEXT,
      sort_order INT NOT NULL DEFAULT 0,
      is_active  BOOLEAN NOT NULL DEFAULT TRUE
    )
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql('DROP TABLE IF EXISTS professional_categories');
};
