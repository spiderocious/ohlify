import type { ContentBlock } from '@shared/types/content-block.js';

export interface FaqRow {
  id: string;
  question: string;
  answer: string;
  blocks: ContentBlock[];
  sort_order: number;
  is_published: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface FaqView {
  id: string;
  question: string;
  answer: string;
  blocks: ContentBlock[];
}

export interface SupportContactView {
  support_email: string;
  whatsapp_number: string;
  whatsapp_deeplink: string;
}

export interface TicketRow {
  id: string;
  user_id: string | null;
  guest_id: string | null;
  subject: string;
  message: string;
  attachments: string[];
  status: 'open' | 'pending' | 'resolved' | 'closed';
  created_at: Date;
  updated_at: Date;
}

export interface TicketView {
  ticket_id: string;
  status: TicketRow['status'];
  created_at: string;
}
