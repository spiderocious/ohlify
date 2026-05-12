import { pool } from '@lib/db/pool.js';

import type { LegalDocumentRow, LegalKind } from './legal.types.js';

// Returns the latest published version of the given legal kind, or null if
// none has been published yet. "Latest" is defined as MAX(published_at).
export const findLatestByKind = async (kind: LegalKind): Promise<LegalDocumentRow | null> => {
  const res = await pool.query<LegalDocumentRow>(
    `SELECT kind, version, content_markdown, blocks, published_at, created_at
       FROM legal_documents
      WHERE kind = $1
      ORDER BY published_at DESC
      LIMIT 1`,
    [kind],
  );
  return res.rows[0] ?? null;
};

// Used for ETag computation on the GET endpoints.
export const fingerprintForKind = async (kind: LegalKind): Promise<string | null> => {
  const res = await pool.query<{ version: string; published_at: Date }>(
    `SELECT version, published_at FROM legal_documents
      WHERE kind = $1
      ORDER BY published_at DESC
      LIMIT 1`,
    [kind],
  );
  const row = res.rows[0];
  if (!row) return null;
  return `${row.version}:${row.published_at.toISOString()}`;
};
