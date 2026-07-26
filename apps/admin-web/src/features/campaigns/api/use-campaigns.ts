import { useQueryClient } from '@tanstack/react-query';

import { ADMIN_EP, type AdminCampaign, type SegmentPredicate } from '@ohlify/api';

import { useAdminMutation } from '../../../shared/api/use-admin-mutation.js';
import { useAdminQuery } from '../../../shared/api/use-admin-query.js';

export type CampaignWrite = {
  title: string;
  body?: string;
  deeplink?: string;
  segment?: SegmentPredicate;
};

const KEY = ['admin', 'campaigns'];

export function useCampaigns() {
  return useAdminQuery<{ items: AdminCampaign[] }>({ key: KEY, url: ADMIN_EP.CAMPAIGNS });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useAdminMutation<CampaignWrite, AdminCampaign>(
    { method: 'post', url: ADMIN_EP.CAMPAIGNS },
    { onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }) },
  );
}

/** Live audience size for a predicate — shown before anything is sent. */
export function usePreviewAudience() {
  return useAdminMutation<SegmentPredicate, { audience_size: number }>({
    method: 'post',
    url: ADMIN_EP.BANNER_AUDIENCE_PREVIEW,
  });
}

export function useScheduleCampaign(id: string) {
  const qc = useQueryClient();
  return useAdminMutation<void, AdminCampaign & { audience_size: number }>(
    { method: 'post', url: ADMIN_EP.CAMPAIGN_SCHEDULE(id) },
    { onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }) },
  );
}

export function useCancelCampaign(id: string) {
  const qc = useQueryClient();
  return useAdminMutation<void, AdminCampaign>(
    { method: 'post', url: ADMIN_EP.CAMPAIGN_CANCEL(id) },
    { onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }) },
  );
}
