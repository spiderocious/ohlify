import { useQueryClient } from '@tanstack/react-query';

import { ADMIN_EP, type AdminConfigItem } from '@ohlify/api';

import { useAdminMutation } from '../../../shared/api/use-admin-mutation.js';
import { useAdminQuery } from '../../../shared/api/use-admin-query.js';

export function useAdminConfig() {
  return useAdminQuery<AdminConfigItem[]>({
    key: ['admin', 'config'],
    url: ADMIN_EP.CONFIG,
  });
}

export function usePatchConfig() {
  const qc = useQueryClient();
  return useAdminMutation<{
    updates: Array<{ key: string; value: unknown }>;
    note: string;
  }>(
    { method: 'patch', url: ADMIN_EP.CONFIG },
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'config'] }) },
  );
}
