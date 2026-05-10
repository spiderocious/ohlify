import { useQueryClient } from '@tanstack/react-query';

import { ADMIN_EP, type AdminBanner } from '@ohlify/api';

import { useAdminMutation } from '../../../shared/api/use-admin-mutation.js';
import { useCursorList } from '../../../shared/api/use-cursor-list.js';

type BannerWrite = {
  title: string;
  subtitle?: string | null;
  body?: string | null;
  image_url?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
  deeplink?: string | null;
  audience?: AdminBanner['audience'];
  placement: string;
  priority?: number;
  is_active?: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
};

type BannerFilters = {
  audience?: string;
  placement?: string;
  is_active?: string;
  [k: string]: string | undefined;
};

export function useBanners(filters: BannerFilters) {
  return useCursorList<AdminBanner>({
    key: ['admin', 'banners'],
    url: ADMIN_EP.BANNERS,
    filters,
  });
}

export function useCreateBanner() {
  const qc = useQueryClient();
  return useAdminMutation<BannerWrite, AdminBanner>(
    { method: 'post', url: ADMIN_EP.BANNERS },
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'banners'] }) },
  );
}

export function useUpdateBanner(id: string) {
  const qc = useQueryClient();
  return useAdminMutation<Partial<BannerWrite>, AdminBanner>(
    { method: 'patch', url: () => ADMIN_EP.BANNER(id) },
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'banners'] }) },
  );
}

export function useDeleteBanner(id: string) {
  const qc = useQueryClient();
  return useAdminMutation<void>(
    { method: 'delete', url: () => ADMIN_EP.BANNER(id) },
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'banners'] }) },
  );
}

export function useToggleBanner(id: string) {
  const qc = useQueryClient();
  const activate = useAdminMutation<void>(
    { method: 'post', url: () => ADMIN_EP.BANNER_ACTIVATE(id) },
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'banners'] }) },
  );
  const deactivate = useAdminMutation<void>(
    { method: 'post', url: () => ADMIN_EP.BANNER_DEACTIVATE(id) },
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'banners'] }) },
  );
  return { activate, deactivate };
}
