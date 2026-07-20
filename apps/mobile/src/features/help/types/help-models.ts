/** Mirrors mobile/lib/features/help/help_api.dart. */
export interface HelpContact {
  email: string;
  whatsapp?: string;
}

export function helpContactFromJson(json: Record<string, unknown>): HelpContact {
  return {
    email: (json.email as string) ?? 'support@ohlify.com',
    whatsapp: json.whatsapp as string | undefined,
  };
}

export interface FaqItem {
  question: string;
  answer: string;
}

export function faqItemFromJson(json: Record<string, unknown>): FaqItem {
  return {
    question: (json.question as string) ?? '',
    answer: (json.answer as string) ?? '',
  };
}
