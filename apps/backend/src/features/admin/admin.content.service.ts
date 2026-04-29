import { LegalKind } from '@features/legal/legal.types.js';
import { ServiceError, ServiceSuccess } from '@lib/service-result.js';
import { MESSAGE_KEYS } from '@shared/constants/message-keys.js';

import * as repo from './admin.content.repo.js';
import type {
  AdminCreateFaqDto,
  AdminPublishLegalDto,
  AdminUpdateFaqDto,
} from './admin.write.schema.js';

const VALID_LEGAL_KINDS = new Set<string>([LegalKind.EULA, LegalKind.PRIVACY, LegalKind.TERMS]);

const toLegalView = (row: {
  kind: string;
  version: string;
  content_markdown: string | null;
  blocks: unknown;
  published_at: Date;
  created_at: Date;
}) => ({
  kind: row.kind,
  version: row.version,
  content_markdown: row.content_markdown,
  blocks: row.blocks,
  published_at: row.published_at.toISOString(),
  created_at: row.created_at.toISOString(),
});

const toFaqView = (row: repo.FaqRow) => ({
  id: row.id,
  question: row.question,
  answer: row.answer,
  blocks: row.blocks,
  sort_order: row.sort_order,
  is_published: row.is_published,
  created_at: row.created_at.toISOString(),
  updated_at: row.updated_at.toISOString(),
});

// ── Legal ──────────────────────────────────────────────────────────────────

export const listLegal = async (kind: string) => {
  if (!VALID_LEGAL_KINDS.has(kind)) {
    return new ServiceError('validation_error', MESSAGE_KEYS.ADMIN_LEGAL_FETCHED, 400, {
      kind: ['Must be one of: eula, privacy, terms'],
    });
  }
  const rows = await repo.legalListByKind(kind as LegalKind);
  return new ServiceSuccess(
    { kind, items: rows.map(toLegalView) },
    MESSAGE_KEYS.ADMIN_LEGAL_FETCHED,
  );
};

export const publishLegal = async (kind: string, dto: AdminPublishLegalDto) => {
  if (!VALID_LEGAL_KINDS.has(kind)) {
    return new ServiceError('validation_error', MESSAGE_KEYS.ADMIN_LEGAL_PUBLISHED, 400, {
      kind: ['Must be one of: eula, privacy, terms'],
    });
  }
  // (kind, version) is the PK — same version twice is a 409.
  try {
    const row = await repo.legalInsert({
      kind: kind as LegalKind,
      version: dto.version,
      contentMarkdown: dto.content_markdown ?? null,
      blocks: dto.blocks ?? [],
    });
    return new ServiceSuccess(toLegalView(row), MESSAGE_KEYS.ADMIN_LEGAL_PUBLISHED);
  } catch (err) {
    if (typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505') {
      return new ServiceError('conflict', MESSAGE_KEYS.ADMIN_LEGAL_PUBLISHED, 409, {
        version: ['That version already exists for this kind'],
      });
    }
    throw err;
  }
};

// ── FAQs ───────────────────────────────────────────────────────────────────

export const listFaqs = async () => {
  const rows = await repo.faqsListAll();
  return new ServiceSuccess({ items: rows.map(toFaqView) }, MESSAGE_KEYS.ADMIN_FAQS_LIST_FETCHED);
};

export const createFaq = async (dto: AdminCreateFaqDto) => {
  const row = await repo.faqsCreate({
    question: dto.question,
    answer: dto.answer,
    blocks: dto.blocks ?? [],
    sortOrder: dto.sort_order ?? 0,
    isPublished: dto.is_published ?? true,
  });
  return new ServiceSuccess(toFaqView(row), MESSAGE_KEYS.ADMIN_FAQ_CREATED);
};

export const updateFaq = async (faqId: string, dto: AdminUpdateFaqDto) => {
  const existing = await repo.faqsFindById(faqId);
  if (!existing) {
    return new ServiceError('not_found', MESSAGE_KEYS.ADMIN_FAQ_UPDATED, 404);
  }
  const row = await repo.faqsUpdate(faqId, {
    ...(dto.question !== undefined ? { question: dto.question } : {}),
    ...(dto.answer !== undefined ? { answer: dto.answer } : {}),
    ...(dto.blocks !== undefined ? { blocks: dto.blocks } : {}),
    ...(dto.sort_order !== undefined ? { sortOrder: dto.sort_order } : {}),
    ...(dto.is_published !== undefined ? { isPublished: dto.is_published } : {}),
  });
  return new ServiceSuccess(toFaqView(row!), MESSAGE_KEYS.ADMIN_FAQ_UPDATED);
};

export const deleteFaq = async (faqId: string) => {
  const removed = await repo.faqsDelete(faqId);
  if (!removed) {
    return new ServiceError('not_found', MESSAGE_KEYS.ADMIN_FAQ_DELETED, 404);
  }
  return new ServiceSuccess({ id: faqId }, MESSAGE_KEYS.ADMIN_FAQ_DELETED);
};
