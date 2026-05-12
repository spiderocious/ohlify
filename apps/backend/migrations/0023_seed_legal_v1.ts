import type { MigrationBuilder } from 'node-pg-migrate';

// Placeholder legal docs so /legal/* endpoints return 200 from day one. Real
// content lands when admin publishes a new version (kind, version) — the API
// auto-serves the row with the latest published_at.
const eulaBlocks = JSON.stringify([
  { type: 'title', content: 'End-User License Agreement' },
  { type: 'subtitle', content: 'Version 1.0 — placeholder' },
  {
    type: 'body',
    content:
      'This placeholder will be replaced before launch. Use of Ohlify is subject to the terms published here.',
  },
  { type: 'heading', content: 'Acceptable use' },
  { type: 'body', content: 'Do not use the platform to harass, defraud, or abuse others.' },
]);

const privacyBlocks = JSON.stringify([
  { type: 'title', content: 'Privacy Policy' },
  { type: 'subtitle', content: 'Version 1.0 — placeholder' },
  {
    type: 'body',
    content:
      'This placeholder will be replaced before launch. Ohlify collects only the data needed to operate the platform.',
  },
  { type: 'heading', content: 'What we collect' },
  { type: 'body', content: 'Account info, call metadata, payment records.' },
  { type: 'heading', content: 'What we do not sell' },
  { type: 'body', content: 'Your personal data.' },
]);

const termsBlocks = JSON.stringify([
  { type: 'title', content: 'Terms of Service' },
  { type: 'subtitle', content: 'Version 1.0 — placeholder' },
  {
    type: 'body',
    content: 'This placeholder will be replaced before launch.',
  },
  { type: 'heading', content: 'Service availability' },
  { type: 'body', content: 'Best-effort uptime; no SLA in v1.' },
]);

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(
    `INSERT INTO legal_documents (kind, version, content_markdown, blocks, published_at)
     VALUES
       ('eula',    '1.0', NULL, $$${eulaBlocks}$$::jsonb, now()),
       ('privacy', '1.0', NULL, $$${privacyBlocks}$$::jsonb, now()),
       ('terms',   '1.0', NULL, $$${termsBlocks}$$::jsonb, now())`,
  );
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DELETE FROM legal_documents WHERE version = '1.0'`);
};
