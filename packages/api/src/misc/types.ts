export interface ContentBlock {
  type: 'title' | 'subtitle' | 'heading' | 'body';
  content: string;
}

export interface LegalDocument {
  kind: 'eula' | 'privacy' | 'terms';
  version: string;
  blocks: ContentBlock[];
  content_markdown: string | null;
  published_at: string;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
  blocks: ContentBlock[];
}

export interface HelpContact {
  support_email: string;
  whatsapp_number: string;
  whatsapp_deeplink: string;
}

export interface PublicConfig {
  values: Record<string, unknown>;
  fetched_at: string;
}
