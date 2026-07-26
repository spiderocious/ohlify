import { AppButton, AppText } from '@ohlify/ui';
import { CampaignStatus, type AdminCampaign } from '@ohlify/api';

import { StatusPill, StatusTone } from '../../../shared/parts/status-pill.js';
import { confirm, toastError, toastSuccess } from '../../../shared/lib/confirm.js';
import { useCancelCampaign, useScheduleCampaign } from '../api/use-campaigns.js';

const STATUS_TONES: Record<string, StatusTone> = {
  [CampaignStatus.DRAFT]: StatusTone.MUTED,
  [CampaignStatus.SCHEDULED]: StatusTone.WARNING,
  [CampaignStatus.SENDING]: StatusTone.INFO,
  [CampaignStatus.SENT]: StatusTone.SUCCESS,
  [CampaignStatus.CANCELLED]: StatusTone.NEUTRAL,
  [CampaignStatus.FAILED]: StatusTone.DANGER,
};

const describeSegment = (campaign: AdminCampaign): string => {
  const parts: string[] = [];
  if (campaign.segment.role) parts.push(`${campaign.segment.role}s`);
  if (campaign.segment.account_age_max_days !== undefined) {
    parts.push(`joined < ${campaign.segment.account_age_max_days}d ago`);
  }
  if (campaign.segment.account_age_min_days !== undefined) {
    parts.push(`joined > ${campaign.segment.account_age_min_days}d ago`);
  }
  return parts.length > 0 ? parts.join(' · ') : 'Everyone';
};

/**
 * One campaign, with whatever action its state allows.
 *
 * A scheduled campaign shows its send time and a way back — that window is the
 * entire reason the delay exists, and burying it would waste it.
 */
export function CampaignRow({ campaign }: { campaign: AdminCampaign }) {
  const schedule = useScheduleCampaign(campaign.id);
  const cancel = useCancelCampaign(campaign.id);

  const onSchedule = () => {
    void confirm({
      title: 'Send this campaign?',
      message: `It goes out in 5 minutes to everyone matching "${describeSegment(campaign)}". You can cancel until then.`,
      confirmLabel: 'Schedule send',
    }).then((ok) => {
      if (!ok) return;
      schedule.mutate(undefined, {
        onSuccess: (data) =>
          toastSuccess(`Scheduled for ${data.audience_size} people. Cancel within 5 minutes.`),
        onError: (err) => toastError(err),
      });
    });
  };

  const onCancel = () => {
    cancel.mutate(undefined, {
      onSuccess: () => toastSuccess('Campaign cancelled. Nothing was sent.'),
      onError: (err) => toastError(err),
    });
  };

  return (
    <div className="flex items-start gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <AppText variant="body" weight={600}>
            {campaign.title}
          </AppText>
          <StatusPill
            label={campaign.status}
            tone={STATUS_TONES[campaign.status] ?? StatusTone.NEUTRAL}
          />
        </div>
        {campaign.body ? <p className="mt-1 text-sm text-slate-600">{campaign.body}</p> : null}
        <p className="mt-1 text-xs text-slate-500">
          {describeSegment(campaign)}
          {campaign.status === CampaignStatus.SENT ? ` · reached ${campaign.recipients}` : ''}
          {campaign.status === CampaignStatus.SCHEDULED && campaign.send_at
            ? ` · sends ${new Date(campaign.send_at).toLocaleTimeString()}`
            : ''}
        </p>
        {campaign.error ? <p className="mt-1 text-xs text-error">{campaign.error}</p> : null}
      </div>

      {campaign.status === CampaignStatus.DRAFT ? (
        <AppButton
          label="Send"
          variant="solid"
          height={34}
          isLoading={schedule.isPending}
          onPressed={onSchedule}
        />
      ) : null}
      {campaign.status === CampaignStatus.SCHEDULED ? (
        <AppButton
          label="Cancel"
          variant="outline"
          height={34}
          isLoading={cancel.isPending}
          onPressed={onCancel}
        />
      ) : null}
    </div>
  );
}
