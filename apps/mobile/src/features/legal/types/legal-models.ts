/** Mirrors mobile/lib/features/legal/legal_api.dart. */
export type LegalDocKind = 'eula' | 'privacy' | 'terms';

export interface LegalDoc {
  kind: string;
  title: string;
  /** Markdown body. */
  body: string;
  updatedAt: string;
}

export function legalDocFromJson(json: Record<string, unknown>): LegalDoc {
  return {
    kind: (json.kind as string) ?? '',
    title: (json.title as string) ?? '',
    body: (json.body as string) ?? '',
    updatedAt: (json.updated_at as string) ?? new Date().toISOString(),
  };
}
