import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ADMIN_EP, adminApiClient, parseApiError, type AdminWithdrawal } from '@ohlify/api';

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
export const useRejectWithdrawal = withdrawalAction<{ reason: string }>(ADMIN_EP.WITHDRAWAL_REJECT);
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

export interface BulkWithdrawalResult {
  succeeded: string[];
  failed: { id: string; message: string }[];
}

/**
 * Applies one action across a selection, sequentially.
 *
 * Serial rather than parallel: each approval fires a Paystack transfer, and a
 * burst of them is exactly the shape that trips rate limits. Failures are
 * collected rather than thrown — one bad row must not hide the fact that the
 * other nine went through, and the caller reports both halves.
 */
export function useBulkWithdrawalAction(
  buildUrl: (id: string) => string,
  body?: (id: string) => Record<string, unknown>,
) {
  const qc = useQueryClient();
  return useMutation<BulkWithdrawalResult, never, string[]>({
    mutationFn: async (ids) => {
      const result: BulkWithdrawalResult = { succeeded: [], failed: [] };
      for (const id of ids) {
        try {
          await adminApiClient.post(buildUrl(id), { json: body?.(id) ?? {} }).json();
          result.succeeded.push(id);
        } catch (err) {
          const parsed = await parseApiError(err);
          result.failed.push({ id, message: parsed.errorMessage ?? 'Failed' });
        }
      }
      return result;
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ['admin', 'withdrawals'] }),
  });
}
