import { useQueryClient } from '@tanstack/react-query';

import { ADMIN_EP, type AdminAppVersion } from '@ohlify/api';

import { useAdminMutation } from '../../../shared/api/use-admin-mutation.js';
import { useAdminQuery } from '../../../shared/api/use-admin-query.js';

export type AppVersionWrite = {
  platform: AdminAppVersion['platform'];
  min_version: string;
  forced: boolean;
  store_url: string;
  title: string;
  description_md?: string | null;
  illustration_key?: string | null;
};

export function useAppVersions() {
  return useAdminQuery<{ items: AdminAppVersion[] }>({
    key: ['admin', 'app-versions'],
    url: ADMIN_EP.APP_VERSIONS,
  });
}

/** Upsert — one row per platform, so PUT rather than POST/PATCH. */
export function useSaveAppVersion() {
  const qc = useQueryClient();
  return useAdminMutation<AppVersionWrite, AdminAppVersion>(
    { method: 'put', url: ADMIN_EP.APP_VERSIONS },
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'app-versions'] }) },
  );
}
