import { Queue } from 'bullmq';

import { env } from '../../env.js';

export interface CampaignJob {
  campaignId: string;
}

export const CAMPAIGN_QUEUE_NAME = 'campaign-send';

/**
 * Delayed sends.
 *
 * BullMQ rather than a bespoke scheduler: the delay, the cancellation
 * (`job.remove()`), and the retry semantics all come for free, and the same
 * Redis already runs the email queue.
 *
 * One attempt only — a campaign that half-sent must not silently send again.
 * `materialiseNotifications` is a single statement, so a failure leaves nothing
 * partially written, and a human decides whether to re-queue.
 */
export const campaignQueue = new Queue<CampaignJob>(CAMPAIGN_QUEUE_NAME, {
  connection: { url: env.REDIS_URL },
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
});
