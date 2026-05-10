import { useQueryClient } from '@tanstack/react-query';

import { ADMIN_EP, type AdminKycSubmission } from '@ohlify/api';

import { useAdminMutation } from '../../../shared/api/use-admin-mutation.js';
import { useCursorList } from '../../../shared/api/use-cursor-list.js';

type KycFilters = {
  status?: string;
  role?: string;
  [k: string]: string | undefined;
};

export function useKycSubmissions(filters: KycFilters) {
  return useCursorList<AdminKycSubmission>({
    key: ['admin', 'kyc'],
    url: ADMIN_EP.KYC_LIST,
    filters,
  });
}

export function useApproveKyc(id: string) {
  const qc = useQueryClient();
  return useAdminMutation<{ note?: string }>(
    { method: 'post', url: () => ADMIN_EP.KYC_APPROVE(id) },
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'kyc'] }) },
  );
}

export function useRejectKyc(id: string) {
  const qc = useQueryClient();
  return useAdminMutation<{ reason_code: string; note: string }>(
    { method: 'post', url: () => ADMIN_EP.KYC_REJECT(id) },
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'kyc'] }) },
  );
}
