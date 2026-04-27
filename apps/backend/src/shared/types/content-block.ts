import { z } from 'zod';

// ContentBlock — the canonical schema for backend-controlled UI content.
// Used by legal docs (§15), FAQs (§16), banners (§21), in-app messages, and
// future dashboard widgets. The mobile/web client iterates `blocks` and maps
// each `type` to a renderer.
//
// Style note: POJO const accessed as ContentBlockType.TITLE (matches
// ERROR_CODES / MESSAGE_KEYS pattern in this codebase).
export const ContentBlockType = {
  TITLE: 'title',
  SUBTITLE: 'subtitle',
  HEADING: 'heading',
  BODY: 'body',
  LIST: 'list',
  IMAGE: 'image',
  VIDEO: 'video',
  CALLOUT: 'callout',
  DIVIDER: 'divider',
  CTA: 'cta',
  SPACER: 'spacer',
  MARKDOWN: 'markdown',
} as const;

export type ContentBlockType = (typeof ContentBlockType)[keyof typeof ContentBlockType];

// Each block carries a type and a content payload. Simple text blocks use a
// string; richer blocks use a typed object content. The discriminated union
// below covers every shape the API may emit.
export type SimpleTextContentBlockType =
  | typeof ContentBlockType.TITLE
  | typeof ContentBlockType.SUBTITLE
  | typeof ContentBlockType.HEADING
  | typeof ContentBlockType.BODY
  | typeof ContentBlockType.MARKDOWN;

export interface SimpleTextContentBlock {
  type: SimpleTextContentBlockType;
  content: string;
}

export interface ListContentBlock {
  type: typeof ContentBlockType.LIST;
  content: { items: string[]; ordered?: boolean };
}

export interface ImageContentBlock {
  type: typeof ContentBlockType.IMAGE;
  content: { src: string; alt?: string; caption?: string };
}

export interface VideoContentBlock {
  type: typeof ContentBlockType.VIDEO;
  content: { src: string; poster?: string; caption?: string };
}

export interface CalloutContentBlock {
  type: typeof ContentBlockType.CALLOUT;
  content: { variant: 'info' | 'success' | 'warning' | 'error'; body: string };
}

export interface DividerContentBlock {
  type: typeof ContentBlockType.DIVIDER;
  content: null;
}

export interface CtaContentBlock {
  type: typeof ContentBlockType.CTA;
  content: { label: string; deeplink: string; style?: 'primary' | 'secondary' | 'link' };
}

export interface SpacerContentBlock {
  type: typeof ContentBlockType.SPACER;
  content: { size: 'sm' | 'md' | 'lg' };
}

export type ContentBlock =
  | SimpleTextContentBlock
  | ListContentBlock
  | ImageContentBlock
  | VideoContentBlock
  | CalloutContentBlock
  | DividerContentBlock
  | CtaContentBlock
  | SpacerContentBlock;

// Zod schema for validating blocks at write time (e.g. admin publishing legal
// content or banners). At read time we trust DB rows — the writes are gated.
export const ContentBlockSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal(ContentBlockType.TITLE),
    content: z.string().min(1).max(200),
  }),
  z.object({
    type: z.literal(ContentBlockType.SUBTITLE),
    content: z.string().min(1).max(300),
  }),
  z.object({
    type: z.literal(ContentBlockType.HEADING),
    content: z.string().min(1).max(200),
  }),
  z.object({
    type: z.literal(ContentBlockType.BODY),
    content: z.string().min(1).max(10_000),
  }),
  z.object({
    type: z.literal(ContentBlockType.MARKDOWN),
    content: z.string().min(1).max(20_000),
  }),
  z.object({
    type: z.literal(ContentBlockType.LIST),
    content: z.object({
      items: z.array(z.string().min(1).max(500)).min(1).max(50),
      ordered: z.boolean().optional(),
    }),
  }),
  z.object({
    type: z.literal(ContentBlockType.IMAGE),
    content: z.object({
      src: z.string().min(1).max(1024),
      alt: z.string().max(300).optional(),
      caption: z.string().max(500).optional(),
    }),
  }),
  z.object({
    type: z.literal(ContentBlockType.VIDEO),
    content: z.object({
      src: z.string().min(1).max(1024),
      poster: z.string().max(1024).optional(),
      caption: z.string().max(500).optional(),
    }),
  }),
  z.object({
    type: z.literal(ContentBlockType.CALLOUT),
    content: z.object({
      variant: z.enum(['info', 'success', 'warning', 'error']),
      body: z.string().min(1).max(2000),
    }),
  }),
  z.object({
    type: z.literal(ContentBlockType.DIVIDER),
    content: z.null(),
  }),
  z.object({
    type: z.literal(ContentBlockType.CTA),
    content: z.object({
      label: z.string().min(1).max(80),
      deeplink: z.string().min(1).max(512),
      style: z.enum(['primary', 'secondary', 'link']).optional(),
    }),
  }),
  z.object({
    type: z.literal(ContentBlockType.SPACER),
    content: z.object({ size: z.enum(['sm', 'md', 'lg']) }),
  }),
]);

export const ContentBlocksSchema = z.array(ContentBlockSchema).max(200);
