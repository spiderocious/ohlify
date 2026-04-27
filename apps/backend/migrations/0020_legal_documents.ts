import type { MigrationBuilder } from 'node-pg-migrate';

// Versioned legal documents (EULA, privacy, terms). Latest published version
// per `kind` is the one returned by `GET /legal/{kind}`. Content is stored
// both as a structured block array (preferred) and a markdown fallback. Per
// db-schema.md §3.28.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TABLE legal_documents (
      kind             TEXT NOT NULL CHECK (kind IN ('eula','privacy','terms')),
      version          TEXT NOT NULL,
      content_markdown TEXT,
      blocks           JSONB NOT NULL DEFAULT '[]'::jsonb,
      published_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (kind, version)
    )
  `);
  pgm.sql(`
    CREATE INDEX legal_documents_latest_idx
      ON legal_documents (kind, published_at DESC)
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DROP TABLE IF EXISTS legal_documents`);
};
