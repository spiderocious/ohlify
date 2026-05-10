import { useQueryClient } from '@tanstack/react-query';

import { ADMIN_EP, type AdminReport } from '@ohlify/api';

import { useAdminMutation } from '../../../shared/api/use-admin-mutation.js';
import { useCursorList } from '../../../shared/api/use-cursor-list.js';

type ReportsFilters = {
  status?: string;
  target_type?: string;
  target_id?: string;
  [k: string]: string | undefined;
};

export function useReports(filters: ReportsFilters) {
  return useCursorList<AdminReport>({
    key: ['admin', 'reports'],
    url: ADMIN_EP.REPORTS,
    filters,
  });
}

function reportAction<TBody>(buildUrl: (id: string) => string) {
  return function useAction(id: string) {
    const qc = useQueryClient();
    return useAdminMutation<TBody, AdminReport>(
      { method: 'post', url: () => buildUrl(id) },
      { onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'reports'] }) },
    );
  };
}

// Backend AdminResolveReportSchema + AdminDismissReportSchema both accept
// `{ note: string (1..2000) }`.
export const useResolveReport = reportAction<{ note: string }>(ADMIN_EP.REPORT_RESOLVE);
export const useDismissReport = reportAction<{ note: string }>(ADMIN_EP.REPORT_DISMISS);
