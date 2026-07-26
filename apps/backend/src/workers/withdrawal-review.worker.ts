import { Worker } from 'bullmq';

import {
  resolveExpiredReview,
  WITHDRAWAL_REVIEW_QUEUE_NAME,
  type WithdrawalReviewJob,
} from '@features/wallet/index.js';
import { logger } from '@lib/logger.js';

import { env } from '../env.js';

export interface WithdrawalReviewWorkerHandle {
  close: () => Promise<void>;
}

/**
 * Resolves manual-review withdrawals whose deadline passed.
 *
 * Concurrency 1: each job moves real money, and a serial queue makes the
 * ordering of "timeout fired" against "admin ruled" unambiguous. The
 * still-pending guard lives in `resolveExpiredReview`.
 */
export const startWithdrawalReviewWorker = (): WithdrawalReviewWorkerHandle => {
  const worker = new Worker<WithdrawalReviewJob>(
    WITHDRAWAL_REVIEW_QUEUE_NAME,
    async (job) => {
      await resolveExpiredReview(job.data.withdrawalId);
    },
    { connection: { url: env.REDIS_URL }, concurrency: 1 },
  );

  worker.on('failed', (job, err) => {
    logger.error({ err, withdrawalId: job?.data.withdrawalId }, 'withdrawal review job failed');
  });

  logger.info({ queue: WITHDRAWAL_REVIEW_QUEUE_NAME }, 'withdrawal review worker started');
  return { close: () => worker.close() };
};
