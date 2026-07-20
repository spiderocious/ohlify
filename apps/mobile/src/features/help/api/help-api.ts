import { apiClient } from '@shared/api/api-client';

import { faqItemFromJson, helpContactFromJson, type FaqItem, type HelpContact } from '../types/help-models';

/** Mirrors mobile/lib/features/help/help_api.dart's HelpApiHttp. */
export const helpApi = {
  async getContact(): Promise<HelpContact> {
    return apiClient.get('help/contact', { fromJson: (data) => helpContactFromJson(data as Record<string, unknown>) }) as Promise<HelpContact>;
  },

  async getFaqs(): Promise<FaqItem[]> {
    return apiClient.get('help/faqs', {
      fromJson: (data) => (data as unknown[]).map((e) => faqItemFromJson(e as Record<string, unknown>)),
    }) as Promise<FaqItem[]>;
  },

  async submitTicket(params: { subject: string; message: string; attachmentKeys?: string[] }): Promise<void> {
    await apiClient.post(
      'help/tickets',
      { subject: params.subject, message: params.message, attachments: params.attachmentKeys },
      { fromJson: () => undefined },
    );
  },
};
