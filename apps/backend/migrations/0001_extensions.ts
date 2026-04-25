import type { MigrationBuilder } from 'node-pg-migrate';

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql('CREATE EXTENSION IF NOT EXISTS citext');
  pgm.sql('CREATE EXTENSION IF NOT EXISTS btree_gist');
  pgm.sql('CREATE EXTENSION IF NOT EXISTS pg_trgm');
  pgm.sql('CREATE EXTENSION IF NOT EXISTS pgcrypto');
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql('DROP EXTENSION IF EXISTS pgcrypto');
  pgm.sql('DROP EXTENSION IF EXISTS pg_trgm');
  pgm.sql('DROP EXTENSION IF EXISTS btree_gist');
  pgm.sql('DROP EXTENSION IF EXISTS citext');
};
