import { platformConfig } from '@lib/config/platform-config.service.js';
import { ServiceSuccess } from '@lib/service-result.js';
import { MESSAGE_KEYS } from '@shared/constants/message-keys.js';

import * as repo from './support.repo.js';
import type { CreateTicketDto } from './support.schema.js';
import type { FaqRow, FaqView, SupportContactView, TicketView } from './support.types.js';

const toFaqView = (row: FaqRow): FaqView => ({
  id: row.id,
  question: row.question,
  answer: row.answer,
  blocks: row.blocks,
});

export const listFaqs = async () => {
  const rows = await repo.findPublishedFaqs();
  return new ServiceSuccess(rows.map(toFaqView), MESSAGE_KEYS.FAQS_FETCHED);
};

export const fingerprintFaqs = () => repo.fingerprintFaqs();

export const getContact = () => {
  const support = platformConfig.support();
  const view: SupportContactView = {
    support_email: support.email,
    whatsapp_number: support.whatsapp_number,
    whatsapp_deeplink: support.whatsapp_deeplink,
  };
  return new ServiceSuccess(view, MESSAGE_KEYS.CONTACT_FETCHED);
};

export const createTicket = async (dto: CreateTicketDto, userId: string) => {
  const row = await repo.createTicket({
    userId,
    subject: dto.subject,
    message: dto.message,
    attachments: dto.attachments ?? [],
  });
  const view: TicketView = {
    ticket_id: row.id,
    status: row.status,
    created_at: row.created_at.toISOString(),
  };
  return new ServiceSuccess(view, MESSAGE_KEYS.TICKET_CREATED);
};
