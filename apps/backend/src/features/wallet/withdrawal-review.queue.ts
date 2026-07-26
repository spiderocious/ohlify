import { Queue } from 'bullmq';

import { env } from '../../env.js';

export interface WithdrawalReviewJob {
  withdrawalId: string;
}

export const WITHDRAWAL_REVIEW_QUEUE_NAME = 'withdrawal-review-timeout';

/**
 * Deadline for a withdrawal parked in manual review.
 *
 * One delayed job per parked withdrawal rather than a periodic sweep: the
 * deadline is per-row (it starts when that withdrawal was requested), and a
 * sweep would have to re-derive it on every tick.
 *
 * One attempt only. The executor is idempotent — it re-reads the row and
 * no-ops unless it is still `pending` — but a retry storm against Paystack on
 * an auto-approve is not something a timeout should cause.
 */
export const withdrawalReviewQueue = new Queue<WithdrawalReviewJob>(WITHDRAWAL_REVIEW_QUEUE_NAME, {
  connection: { url: env.REDIS_URL },
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
});

/** Job id is derived from the withdrawal so re-queuing the same row cannot double-book it. */
export const withdrawalReviewJobId = (withdrawalId: string): string =>
  `withdrawal-review-${withdrawalId}`;
