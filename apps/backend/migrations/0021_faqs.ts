import type { MigrationBuilder } from 'node-pg-migrate';

// FAQ entries for the help screen. Sorted by sort_order ASC. Long-form answers
// can use the structured ContentBlock array (`blocks` column); shorter ones
// use plain `answer` text. UI prefers blocks when present.
// Per db-schema.md §3.29.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TABLE faqs (
      id            TEXT PRIMARY KEY,
      question      TEXT NOT NULL,
      answer        TEXT NOT NULL,
      blocks        JSONB NOT NULL DEFAULT '[]'::jsonb,
      sort_order    INT NOT NULL DEFAULT 0,
      is_published  BOOLEAN NOT NULL DEFAULT TRUE,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  pgm.sql(`
    CREATE INDEX faqs_published_idx
      ON faqs (sort_order ASC, created_at ASC)
      WHERE is_published = TRUE
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DROP TABLE IF EXISTS faqs`);
};
