import type { ContentBlock } from '@shared/types/content-block.js';

export const LegalKind = {
  EULA: 'eula',
  PRIVACY: 'privacy',
  TERMS: 'terms',
} as const;

export type LegalKind = (typeof LegalKind)[keyof typeof LegalKind];

export interface LegalDocumentRow {
  kind: LegalKind;
  version: string;
  content_markdown: string | null;
  blocks: ContentBlock[];
  published_at: Date;
  created_at: Date;
}

export interface LegalDocumentView {
  kind: LegalKind;
  version: string;
  blocks: ContentBlock[];
  content_markdown: string | null;
  published_at: string;
}
