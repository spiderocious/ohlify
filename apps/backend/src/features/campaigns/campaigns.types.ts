import type { SegmentPredicate } from '@features/banners/banner-segments.js';

export const CampaignStatus = {
  DRAFT: 'draft',
  /** Queued with a delay; still cancellable. */
  SCHEDULED: 'scheduled',
  SENDING: 'sending',
  SENT: 'sent',
  CANCELLED: 'cancelled',
  FAILED: 'failed',
} as const;

export type CampaignStatus = (typeof CampaignStatus)[keyof typeof CampaignStatus];

/**
 * How long a scheduled send waits before it actually goes out.
 *
 * The window exists to be cancellable — an admin who spots a typo in a message
 * about to reach every user needs a way back, and five minutes is long enough
 * to notice without making the feature feel broken.
 */
export const CAMPAIGN_SEND_DELAY_MS = 5 * 60 * 1000;

export interface CampaignRow {
  id: string;
  title: string;
  body: string | null;
  deeplink: string | null;
  segment: SegmentPredicate;
  status: CampaignStatus;
  send_at: Date | null;
  job_id: string | null;
  recipients: number;
  error: string | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
  sent_at: Date | null;
}

export interface CampaignView {
  id: string;
  title: string;
  body: string | null;
  deeplink: string | null;
  segment: SegmentPredicate;
  status: CampaignStatus;
  send_at: string | null;
  /** How many notification rows the send actually wrote. */
  recipients: number;
  error: string | null;
  created_at: string;
  sent_at: string | null;
}
