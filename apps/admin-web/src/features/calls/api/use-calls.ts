import { useQueryClient } from '@tanstack/react-query';

import {
  ADMIN_EP,
  type AdminBooking,
  type AdminCallDetail,
  type AdminCallListItem,
} from '@ohlify/api';

import { useAdminMutation } from '../../../shared/api/use-admin-mutation.js';
import { useAdminQuery } from '../../../shared/api/use-admin-query.js';
import { useCursorList } from '../../../shared/api/use-cursor-list.js';

type CallsFilters = {
  status?: string;
  user_id?: string;
  [k: string]: string | undefined;
};

export function useAdminCalls(filters: CallsFilters) {
  return useCursorList<AdminCallListItem>({
    key: ['admin', 'calls'],
    url: ADMIN_EP.CALLS,
    filters,
  });
}

export function useAdminCall(id: string | null) {
  return useAdminQuery<AdminCallDetail>({
    key: ['admin', 'call', id],
    url: id ? ADMIN_EP.CALL(id) : '',
    enabled: Boolean(id),
  });
}

// Backend force-end takes no body.
export function useForceEndCall(id: string) {
  const qc = useQueryClient();
  return useAdminMutation<void, AdminCallDetail>(
    { method: 'post', url: () => ADMIN_EP.CALL_FORCE_END(id) },
    {
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: ['admin', 'calls'] });
        void qc.invalidateQueries({ queryKey: ['admin', 'call', id] });
      },
    },
  );
}

export function useRefundCall(id: string) {
  const qc = useQueryClient();
  return useAdminMutation<
    { amount_kobo: number; reason: string; request_id: string },
    AdminCallDetail
  >(
    { method: 'post', url: () => ADMIN_EP.CALL_REFUND(id) },
    {
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: ['admin', 'calls'] });
        void qc.invalidateQueries({ queryKey: ['admin', 'call', id] });
      },
    },
  );
}

export function useTestInitCall() {
  const qc = useQueryClient();
  return useAdminMutation<
    {
      caller_user_id: string;
      callee_user_id: string;
      rate_id?: string;
      start_in_seconds?: number;
    },
    AdminCallDetail
  >(
    { method: 'post', url: ADMIN_EP.CALL_TEST_INIT },
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'calls'] }) },
  );
}

type BookingsFilters = {
  status?: string;
  user_id?: string;
  [k: string]: string | undefined;
};

export function useAdminBookings(filters: BookingsFilters) {
  return useCursorList<AdminBooking>({
    key: ['admin', 'bookings'],
    url: ADMIN_EP.BOOKINGS,
    filters,
  });
}
