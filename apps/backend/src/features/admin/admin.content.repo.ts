import type { LegalDocumentRow, LegalKind } from '@features/legal/legal.types.js';
import { pool } from '@lib/db/pool.js';
import { id as newId } from '@lib/ids.js';

export interface FaqRow {
  id: string;
  question: string;
  answer: string;
  blocks: unknown;
  sort_order: number;
  is_published: boolean;
  created_at: Date;
  updated_at: Date;
}

// ── Legal ──────────────────────────────────────────────────────────────────

export const legalListByKind = async (kind: LegalKind): Promise<LegalDocumentRow[]> => {
  const res = await pool.query<LegalDocumentRow>(
    `SELECT kind, version, content_markdown, blocks, published_at, created_at
       FROM legal_documents
       WHERE kind = $1
       ORDER BY published_at DESC`,
    [kind],
  );
  return res.rows;
};

export interface InsertLegalInput {
  kind: LegalKind;
  version: string;
  contentMarkdown: string | null;
  blocks: unknown;
}

export const legalInsert = async (input: InsertLegalInput): Promise<LegalDocumentRow> => {
  const res = await pool.query<LegalDocumentRow>(
    `INSERT INTO legal_documents (kind, version, content_markdown, blocks)
     VALUES ($1, $2, $3, $4::jsonb)
     RETURNING kind, version, content_markdown, blocks, published_at, created_at`,
    [input.kind, input.version, input.contentMarkdown, JSON.stringify(input.blocks ?? [])],
  );
  return res.rows[0]!;
};

// ── FAQs ───────────────────────────────────────────────────────────────────

export const faqsListAll = async (): Promise<FaqRow[]> => {
  const res = await pool.query<FaqRow>(
    `SELECT id, question, answer, blocks, sort_order, is_published, created_at, updated_at
       FROM faqs
       ORDER BY sort_order ASC, created_at ASC, id ASC`,
  );
  return res.rows;
};

export const faqsFindById = async (faqId: string): Promise<FaqRow | null> => {
  const res = await pool.query<FaqRow>(
    `SELECT id, question, answer, blocks, sort_order, is_published, created_at, updated_at
       FROM faqs
       WHERE id = $1`,
    [faqId],
  );
  return res.rows[0] ?? null;
};

export interface CreateFaqInput {
  question: string;
  answer: string;
  blocks: unknown;
  sortOrder: number;
  isPublished: boolean;
}

export const faqsCreate = async (input: CreateFaqInput): Promise<FaqRow> => {
  const faqId = newId('faq');
  const res = await pool.query<FaqRow>(
    `INSERT INTO faqs (id, question, answer, blocks, sort_order, is_published)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6)
     RETURNING id, question, answer, blocks, sort_order, is_published, created_at, updated_at`,
    [
      faqId,
      input.question,
      input.answer,
      JSON.stringify(input.blocks ?? []),
      input.sortOrder,
      input.isPublished,
    ],
  );
  return res.rows[0]!;
};

export interface UpdateFaqInput {
  question?: string;
  answer?: string;
  blocks?: unknown;
  sortOrder?: number;
  isPublished?: boolean;
}

export const faqsUpdate = async (faqId: string, input: UpdateFaqInput): Promise<FaqRow | null> => {
  const sets: string[] = [];
  const params: unknown[] = [];
  if (input.question !== undefined) {
    params.push(input.question);
    sets.push(`question = $${params.length}`);
  }
  if (input.answer !== undefined) {
    params.push(input.answer);
    sets.push(`answer = $${params.length}`);
  }
  if (input.blocks !== undefined) {
    params.push(JSON.stringify(input.blocks ?? []));
    sets.push(`blocks = $${params.length}::jsonb`);
  }
  if (input.sortOrder !== undefined) {
    params.push(input.sortOrder);
    sets.push(`sort_order = $${params.length}`);
  }
  if (input.isPublished !== undefined) {
    params.push(input.isPublished);
    sets.push(`is_published = $${params.length}`);
  }
  if (sets.length === 0) return faqsFindById(faqId);
  params.push(faqId);
  const res = await pool.query<FaqRow>(
    `UPDATE faqs SET ${sets.join(', ')}, updated_at = now()
       WHERE id = $${params.length}
       RETURNING id, question, answer, blocks, sort_order, is_published, created_at, updated_at`,
    params,
  );
  return res.rows[0] ?? null;
};

export const faqsDelete = async (faqId: string): Promise<boolean> => {
  const res = await pool.query(`DELETE FROM faqs WHERE id = $1`, [faqId]);
  return (res.rowCount ?? 0) > 0;
};
