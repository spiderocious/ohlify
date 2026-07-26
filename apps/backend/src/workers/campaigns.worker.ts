import { Worker } from 'bullmq';

import { CAMPAIGN_QUEUE_NAME, executeCampaign } from '@features/campaigns/index.js';
import { logger } from '@lib/logger.js';

import { env } from '../env.js';

export interface CampaignWorkerHandle {
  close: () => Promise<void>;
}

/**
 * Runs delayed campaign sends.
 *
 * Concurrency 1: a send is a single bulk INSERT over the whole audience, so
 * there is nothing to gain from parallelism and a serial queue keeps the
 * ordering of "scheduled then cancelled" unambiguous.
 *
 * The cancellation guard lives in `executeCampaign`, not here — a job already
 * claimed cannot be removed from the queue, so the check has to be the
 * database's, not the queue's.
 */
export const startCampaignWorker = (): CampaignWorkerHandle => {
  const worker = new Worker<{ campaignId: string }>(
    CAMPAIGN_QUEUE_NAME,
    async (job) => {
      await executeCampaign(job.data.campaignId);
    },
    { connection: { url: env.REDIS_URL }, concurrency: 1 },
  );

  worker.on('failed', (job, err) => {
    logger.error({ err, campaignId: job?.data.campaignId }, 'campaign job failed');
  });

  logger.info({ queue: CAMPAIGN_QUEUE_NAME }, 'campaign worker started');
  return { close: () => worker.close() };
};
