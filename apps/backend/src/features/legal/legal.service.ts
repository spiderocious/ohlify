import { ServiceError, ServiceSuccess } from '@lib/service-result.js';
import { MESSAGE_KEYS } from '@shared/constants/message-keys.js';

import * as repo from './legal.repo.js';
import type { LegalDocumentRow, LegalDocumentView, LegalKind } from './legal.types.js';

const toView = (row: LegalDocumentRow): LegalDocumentView => ({
  kind: row.kind,
  version: row.version,
  blocks: row.blocks,
  content_markdown: row.content_markdown,
  published_at: row.published_at.toISOString(),
});

export const getByKind = async (kind: LegalKind) => {
  const row = await repo.findLatestByKind(kind);
  if (!row) {
    return new ServiceError('not_found', MESSAGE_KEYS.LEGAL_NOT_FOUND, 404);
  }
  return new ServiceSuccess(toView(row), MESSAGE_KEYS.LEGAL_FETCHED);
};

export const fingerprintForKind = (kind: LegalKind) => repo.fingerprintForKind(kind);
