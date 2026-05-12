import { useQueryClient } from '@tanstack/react-query';

import { ADMIN_EP, type AdminRefundRequest } from '@ohlify/api';

import { useAdminMutation } from '../../../shared/api/use-admin-mutation.js';
import { useCursorList } from '../../../shared/api/use-cursor-list.js';

type RefundsFilters = {
  status?: string;
  user_id?: string;
  [k: string]: string | undefined;
};

export function useRefunds(filters: RefundsFilters) {
  return useCursorList<AdminRefundRequest>({
    key: ['admin', 'refunds'],
    url: ADMIN_EP.REFUNDS,
    filters,
  });
}

function refundAction<TBody = void>(buildUrl: (id: string) => string) {
  return function useAction(id: string) {
    const qc = useQueryClient();
    return useAdminMutation<TBody, AdminRefundRequest>(
      { method: 'post', url: () => buildUrl(id) },
      { onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'refunds'] }) },
    );
  };
}

export const useApproveRefund = refundAction<{ note?: string }>(ADMIN_EP.REFUND_APPROVE);
export const useRejectRefund = refundAction<{ note: string }>(ADMIN_EP.REFUND_REJECT);
