import type { MigrationBuilder } from 'node-pg-migrate';

// Replace the table-level UNIQUE on professional_rates with a partial unique
// index that only applies to active rows. Without this, soft-deleting a rate
// and re-creating the same (call_type, duration_minutes) shape raises a
// 23505 unique_violation in Postgres → 500 internal at the API layer.
// Bug found by QA — see qa-reviews/banks-rates-test-report.md N-05.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    ALTER TABLE professional_rates
      DROP CONSTRAINT IF EXISTS professional_rates_user_id_call_type_duration_minutes_key
  `);
  pgm.sql(`
    CREATE UNIQUE INDEX professional_rates_active_shape_idx
      ON professional_rates (user_id, call_type, duration_minutes)
      WHERE deleted_at IS NULL
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DROP INDEX IF EXISTS professional_rates_active_shape_idx`);
  pgm.sql(`
    ALTER TABLE professional_rates
      ADD CONSTRAINT professional_rates_user_id_call_type_duration_minutes_key
      UNIQUE (user_id, call_type, duration_minutes)
  `);
};
