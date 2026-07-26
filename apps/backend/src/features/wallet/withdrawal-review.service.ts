import { approveWithdrawal, rejectWithdrawal } from '@features/admin/admin.payments.service.js';
import { platformConfig, WithdrawalTimeoutAction } from '@lib/config/platform-config.service.js';
import { logger } from '@lib/logger.js';
import { ServiceError } from '@lib/service-result.js';

import * as repo from './wallet.repo.js';
import { withdrawalReviewJobId, withdrawalReviewQueue } from './withdrawal-review.queue.js';

const HOUR_MS = 3_600_000;

/**
 * Arms the review deadline for a withdrawal that just parked.
 *
 * Best-effort by design: the withdrawal row and its journal are already
 * committed, and failing the user's request because Redis hiccuped would be
 * worse than a deadline that has to be resolved by hand.
 */
export const scheduleReviewTimeout = async (withdrawalId: string): Promise<void> => {
  const hours = platformConfig.wallet().auto_resolve_after_hours;
  if (hours <= 0) return;

  try {
    await withdrawalReviewQueue.add(
      'resolve',
      { withdrawalId },
      { delay: hours * HOUR_MS, jobId: withdrawalReviewJobId(withdrawalId) },
    );
  } catch (err) {
    logger.error({ err, withdrawalId }, 'failed to arm withdrawal review timeout');
  }
};

/** Cancels the deadline once a human has ruled. A missing job is the normal case, not an error. */
export const cancelReviewTimeout = async (withdrawalId: string): Promise<void> => {
  try {
    const job = await withdrawalReviewQueue.getJob(withdrawalReviewJobId(withdrawalId));
    await job?.remove();
  } catch (err) {
    logger.warn({ err, withdrawalId }, 'failed to cancel withdrawal review timeout');
  }
};

/**
 * Resolves a withdrawal nobody reviewed in time.
 *
 * Re-reads the row and no-ops unless it is still `pending`: an admin who ruled
 * a second before the deadline must win, and the job cannot be un-queued once
 * claimed. This is the same guard the campaign sender uses — the check has to
 * be the database's, not the queue's.
 *
 * Delegates to the admin services rather than reimplementing them, so an
 * auto-approve and a human approve post the same journals and leave the same
 * audit trail.
 */
export const resolveExpiredReview = async (withdrawalId: string): Promise<void> => {
  const wd = await repo.findWithdrawalById(withdrawalId);
  if (!wd) {
    logger.warn({ withdrawalId }, 'review timeout fired for missing withdrawal');
    return;
  }
  if (wd.status !== 'pending') {
    logger.info(
      { withdrawalId, status: wd.status },
      'review timeout fired after withdrawal was already resolved — ignoring',
    );
    return;
  }

  const action = platformConfig.wallet().on_timeout;

  const result =
    action === WithdrawalTimeoutAction.REJECT
      ? await rejectWithdrawal(withdrawalId, {
          reason: 'Automatically rejected — not reviewed within the approval window.',
        })
      : await approveWithdrawal(withdrawalId, {});

  if (result instanceof ServiceError) {
    logger.error(
      { withdrawalId, action, errorCode: result.errorCode },
      'withdrawal review timeout failed to resolve — needs manual attention',
    );
    return;
  }
  logger.warn({ withdrawalId, action }, 'withdrawal auto-resolved on review timeout');
};
