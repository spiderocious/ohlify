/**
 * Mirrors mobile/lib/features/help/help_api.dart. Wire keys are
 * support_email/whatsapp_number/whatsapp_deeplink (support.service.ts's
 * SupportContactView) — a prior version of this parser read `email`/
 * `whatsapp`, which never matched the real payload, so both fields always
 * silently fell back to their defaults regardless of backend config.
 */
export interface HelpContact {
  email: string;
  whatsapp?: string;
  whatsappDeeplink?: string;
}

export function helpContactFromJson(json: Record<string, unknown>): HelpContact {
  return {
    email: (json.support_email as string) ?? 'support@ohlify.com',
    whatsapp: json.whatsapp_number as string | undefined,
    whatsappDeeplink: json.whatsapp_deeplink as string | undefined,
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
