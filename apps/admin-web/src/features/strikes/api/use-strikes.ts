import { useQueryClient } from '@tanstack/react-query';

import {
  ADMIN_EP,
  type AdminStrikeDetailView,
  type AdminStrikeView,
  type StrikeReasonCode,
  type StrikeSubjectRole,
} from '@ohlify/api';

import { useAdminMutation } from '../../../shared/api/use-admin-mutation.js';
import { useAdminQuery } from '../../../shared/api/use-admin-query.js';
import { useCursorList } from '../../../shared/api/use-cursor-list.js';

type StrikesFilters = {
  status?: string;
  subject_user_id?: string;
  subject_role?: string;
  reason_code?: string;
  [k: string]: string | undefined;
};

export function useStrikes(filters: StrikesFilters) {
  return useCursorList<AdminStrikeView>({
    key: ['admin', 'strikes'],
    url: ADMIN_EP.STRIKES,
    filters,
  });
}

export function useStrikeDetail(id: string | null) {
  return useAdminQuery<AdminStrikeDetailView>({
    key: ['admin', 'strike', id],
    url: id ? ADMIN_EP.STRIKE(id) : '',
    enabled: Boolean(id),
  });
}

function strikeAction<TBody>(buildUrl: (id: string) => string) {
  return function useAction(id: string) {
    const qc = useQueryClient();
    return useAdminMutation<TBody, AdminStrikeView>(
      { method: 'post', url: () => buildUrl(id) },
      {
        onSuccess: () => {
          void qc.invalidateQueries({ queryKey: ['admin', 'strikes'] });
          void qc.invalidateQueries({ queryKey: ['admin', 'strike', id] });
        },
      },
    );
  };
}

// Uphold accepts an optional comment; void requires a reason.
export const useUpholdStrike = strikeAction<{ comment?: string }>(ADMIN_EP.STRIKE_UPHOLD);
export const useVoidStrike = strikeAction<{ reason: string }>(ADMIN_EP.STRIKE_VOID);

export interface IssueStrikeBody {
  subject_user_id: string;
  subject_role: StrikeSubjectRole;
  reason_code: StrikeReasonCode;
  description: string;
  related_call_id?: string;
  related_booking_id?: string;
  related_report_id?: string;
}

export function useIssueStrike() {
  const qc = useQueryClient();
  return useAdminMutation<IssueStrikeBody, AdminStrikeView>(
    { method: 'post', url: ADMIN_EP.STRIKE_ISSUE },
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'strikes'] }) },
  );
}
