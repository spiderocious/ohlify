import { useQueryClient } from '@tanstack/react-query';

import { ADMIN_EP, type AdminUserDetail, type AdminUserListItem } from '@ohlify/api';

import { useAdminMutation } from '../../../shared/api/use-admin-mutation.js';
import { useAdminQuery } from '../../../shared/api/use-admin-query.js';
import { useCursorList } from '../../../shared/api/use-cursor-list.js';

type UsersFilters = {
  q?: string;
  status?: string;
  role?: string;
  kyc_status?: string;
  [k: string]: string | undefined;
};

export function useAdminUsers(filters: UsersFilters) {
  return useCursorList<AdminUserListItem>({
    key: ['admin', 'users'],
    url: ADMIN_EP.USERS,
    filters,
  });
}

export function useAdminUser(id: string | null) {
  return useAdminQuery<AdminUserDetail>({
    key: ['admin', 'user', id],
    url: id ? ADMIN_EP.USER(id) : '',
    enabled: Boolean(id),
  });
}

/**
 * Mutation factory shared by every user write action — they all return
 * `void` and just need to invalidate the affected user + the list.
 */
function makeUserAction<TBody = void>(buildUrl: (id: string) => string) {
  return function useAction(userId: string) {
    const qc = useQueryClient();
    return useAdminMutation<TBody, AdminUserDetail>(
      { method: 'post', url: () => buildUrl(userId) },
      {
        onSuccess: () => {
          void qc.invalidateQueries({ queryKey: ['admin', 'users'] });
          void qc.invalidateQueries({ queryKey: ['admin', 'user', userId] });
        },
      },
    );
  };
}

export const useSuspendUser = makeUserAction<{ reason: string }>(ADMIN_EP.USER_SUSPEND);
export const useUnsuspendUser = makeUserAction<{ note?: string }>(ADMIN_EP.USER_UNSUSPEND);
export const useBlockUser = makeUserAction<{ reason: string }>(ADMIN_EP.USER_BLOCK);
export const useUnblockUser = makeUserAction<{ note?: string }>(ADMIN_EP.USER_UNBLOCK);
// Backend AdminResetPasswordSchema is `.strict()` and requires
// { send_email, note } (+ optional new_password). The old `{ notify }` payload
// 400'd every reset. (BUGS.md B5.)
export const useResetUserPassword = makeUserAction<{
  send_email: boolean;
  note: string;
  new_password?: string;
}>(ADMIN_EP.USER_RESET_PASSWORD);
export const useImpersonateUser = makeUserAction<{ reason: string }>(ADMIN_EP.USER_IMPERSONATE);
