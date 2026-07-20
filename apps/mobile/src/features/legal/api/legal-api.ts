import { apiClient } from '@shared/api/api-client';

import { legalDocFromJson, type LegalDoc, type LegalDocKind } from '../types/legal-models';

/** Mirrors mobile/lib/features/legal/legal_api.dart's LegalApiHttp. */
export const legalApi = {
  async getDoc(kind: LegalDocKind): Promise<LegalDoc> {
    return apiClient.get(`legal/${kind}`, { fromJson: (data) => legalDocFromJson(data as Record<string, unknown>) }) as Promise<LegalDoc>;
  },
};
