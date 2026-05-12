import { useQueryClient } from '@tanstack/react-query';

import {
  ADMIN_EP,
  type AdminFaq,
  type AdminLegalDocument,
  type AdminLegalKind,
  type AdminLegalListResponse,
} from '@ohlify/api';

import { useAdminMutation } from '../../../shared/api/use-admin-mutation.js';
import { useAdminQuery } from '../../../shared/api/use-admin-query.js';

export function useLegalDocs(kind: AdminLegalKind) {
  return useAdminQuery<AdminLegalListResponse>({
    key: ['admin', 'legal', kind],
    url: ADMIN_EP.LEGAL_LIST(kind),
  });
}

export function usePublishLegal(kind: AdminLegalKind) {
  const qc = useQueryClient();
  return useAdminMutation<
    { version: string; content_markdown?: string; blocks?: unknown[] },
    AdminLegalDocument
  >(
    { method: 'put', url: () => ADMIN_EP.LEGAL_PUBLISH(kind) },
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'legal', kind] }) },
  );
}

export function useFaqs() {
  return useAdminQuery<AdminFaq[]>({ key: ['admin', 'faqs'], url: ADMIN_EP.FAQS });
}

type FaqWrite = { question: string; answer: string; sort_order?: number; is_published?: boolean };

export function useCreateFaq() {
  const qc = useQueryClient();
  return useAdminMutation<FaqWrite, AdminFaq>(
    { method: 'post', url: ADMIN_EP.FAQS },
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'faqs'] }) },
  );
}
export function useUpdateFaq(id: string) {
  const qc = useQueryClient();
  return useAdminMutation<Partial<FaqWrite>, AdminFaq>(
    { method: 'patch', url: () => ADMIN_EP.FAQ(id) },
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'faqs'] }) },
  );
}
export function useDeleteFaq(id: string) {
  const qc = useQueryClient();
  return useAdminMutation<void>(
    { method: 'delete', url: () => ADMIN_EP.FAQ(id) },
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'faqs'] }) },
  );
}
