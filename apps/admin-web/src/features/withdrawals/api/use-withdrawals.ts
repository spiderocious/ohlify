import { useQueryClient } from '@tanstack/react-query';

import { ADMIN_EP, type AdminWithdrawal } from '@ohlify/api';

import { useAdminMutation } from '../../../shared/api/use-admin-mutation.js';
import { useCursorList } from '../../../shared/api/use-cursor-list.js';

type WithdrawalsFilters = {
  status?: string;
  user_id?: string;
  [k: string]: string | undefined;
};

export function useWithdrawals(filters: WithdrawalsFilters) {
  return useCursorList<AdminWithdrawal>({
    key: ['admin', 'withdrawals'],
    url: ADMIN_EP.WITHDRAWALS,
    filters,
  });
}

function withdrawalAction<TBody = void>(buildUrl: (id: string) => string) {
  return function useAction(id: string) {
    const qc = useQueryClient();
    return useAdminMutation<TBody, AdminWithdrawal>(
      { method: 'post', url: () => buildUrl(id) },
      { onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'withdrawals'] }) },
    );
  };
}

export const useApproveWithdrawal = withdrawalAction<{ note?: string }>(
  ADMIN_EP.WITHDRAWAL_APPROVE,
);
export const useRejectWithdrawal = withdrawalAction<{ reason: string }>(
  ADMIN_EP.WITHDRAWAL_REJECT,
);
export const useForceFailWithdrawal = withdrawalAction<{ reason: string }>(
  ADMIN_EP.WITHDRAWAL_FORCE_FAIL,
);

export function useSyncPayouts() {
  const qc = useQueryClient();
  return useAdminMutation<void>(
    { method: 'post', url: ADMIN_EP.PAYOUTS_SYNC },
    {
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: ['admin', 'withdrawals'] });
        void qc.invalidateQueries({ queryKey: ['admin', 'transactions'] });
      },
    },
  );
}
