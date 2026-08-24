import { countSegmentAudience } from '@features/banners/banner-resolver.js';
import { withTransaction } from '@lib/db/tx.js';
import { logger } from '@lib/logger.js';
import { insertEvent, OutboxAggregateType, OutboxEventType } from '@lib/outbox/index.js';
import { publish, RealtimeEvent } from '@lib/realtime/index.js';
import { ServiceError, ServiceSuccess } from '@lib/service-result.js';
import { MESSAGE_KEYS } from '@shared/constants/message-keys.js';

import { campaignQueue } from './campaigns.queue.js';
import * as repo from './campaigns.repo.js';
import type { CreateCampaignDto } from './campaigns.schema.js';
import {
  CAMPAIGN_SEND_DELAY_MS,
  CampaignStatus,
  type CampaignRow,
  type CampaignView,
} from './campaigns.types.js';

const toView = (row: CampaignRow): CampaignView => ({
  id: row.id,
  title: row.title,
  body: row.body,
  deeplink: row.deeplink,
  segment: row.segment,
  status: row.status,
  send_at: row.send_at ? row.send_at.toISOString() : null,
  recipients: row.recipients,
  error: row.error,
  created_at: row.created_at.toISOString(),
  sent_at: row.sent_at ? row.sent_at.toISOString() : null,
});

export const createCampaign = async (dto: CreateCampaignDto, adminId: string) => {
  const row = await repo.create({
    title: dto.title,
    body: dto.body ?? null,
    deeplink: dto.deeplink ?? null,
    segment: dto.segment ?? {},
    createdBy: adminId === 'adm_stub' ? null : adminId,
  });
  return new ServiceSuccess(toView(row), MESSAGE_KEYS.CAMPAIGN_CREATED);
};

export const listCampaigns = async (limit: number) => {
  const rows = await repo.listAll(limit);
  return new ServiceSuccess({ items: rows.map(toView) }, MESSAGE_KEYS.CAMPAIGNS_LISTED);
};

/**
 * Queues a send five minutes out.
 *
 * The delay is the whole point: a message about to reach every user should be
 * recallable for long enough to notice a mistake. The audience is measured now
 * for the confirmation UI, but re-evaluated at send time — the set can move in
 * five minutes, and the send should reflect reality, not the preview.
 */
export const scheduleCampaign = async (campaignId: string) => {
  const existing = await repo.findById(campaignId);
  if (!existing) {
    return new ServiceError('not_found', MESSAGE_KEYS.CAMPAIGN_NOT_FOUND, 404);
  }
  if (existing.status !== CampaignStatus.DRAFT) {
    return new ServiceError('conflict', MESSAGE_KEYS.CAMPAIGN_NOT_ACTIONABLE, 409);
  }

  const sendAt = new Date(Date.now() + CAMPAIGN_SEND_DELAY_MS);
  const job = await campaignQueue.add(
    'send',
    { campaignId },
    // BullMQ rejects ':' in a custom id — it uses that as its own key
    // separator. Deriving the id from the campaign keeps a double-schedule
    // idempotent at the queue level as well as in the DB.
    { delay: CAMPAIGN_SEND_DELAY_MS, jobId: `campaign-${campaignId}` },
  );

  const updated = await repo.markScheduled(campaignId, job.id ?? '', sendAt);
  if (!updated) {
    // Lost the race to another admin. Drop the job we just queued so the
    // campaign is not sent twice.
    await job.remove().catch(() => undefined);
    return new ServiceError('conflict', MESSAGE_KEYS.CAMPAIGN_NOT_ACTIONABLE, 409);
  }

  const audience = await countSegmentAudience(existing.segment);
  return new ServiceSuccess(
    { ...toView(updated), audience_size: audience },
    MESSAGE_KEYS.CAMPAIGN_SCHEDULED,
  );
};

/**
 * Pulls a scheduled send back.
 *
 * The DB status flips first and the job removal is best-effort: if the job has
 * already started, `remove()` cannot stop it — the worker's own
 * `status = 'scheduled'` guard is what actually prevents the send.
 */
export const cancelCampaign = async (campaignId: string) => {
  const cancelled = await repo.markCancelled(campaignId);
  if (!cancelled) {
    return new ServiceError('conflict', MESSAGE_KEYS.CAMPAIGN_NOT_ACTIONABLE, 409);
  }
  if (cancelled.job_id) {
    const job = await campaignQueue.getJob(cancelled.job_id);
    await job?.remove().catch(() => undefined);
  }
  return new ServiceSuccess(toView(cancelled), MESSAGE_KEYS.CAMPAIGN_CANCELLED);
};

/**
 * Performs the send. Called by the worker when the delay elapses.
 *
 * Claims the campaign first — that single guarded UPDATE is what makes
 * cancellation reliable, because a job already picked up cannot be removed from
 * the queue.
 */
export const executeCampaign = async (campaignId: string): Promise<void> => {
  const claimed = await repo.claimForSending(campaignId);
  if (!claimed) {
    logger.info({ campaignId }, 'campaign no longer scheduled; send skipped');
    return;
  }

  try {
    const recipients = await repo.materialiseNotifications({
      campaignId,
      title: claimed.title,
      body: claimed.body,
      deeplink: claimed.deeplink,
      segment: claimed.segment,
    });
    await repo.markSent(campaignId, recipients);

    const userIds = await repo.listRecipients(campaignId);

    // ACTUALLY DELIVER IT.
    //
    // This step did not exist: the campaign wrote notification rows, published
    // an SSE nudge, and marked itself sent — so it read as delivered in the
    // admin while no phone was ever contacted. SSE only reaches an app that is
    // open and foregrounded, which is precisely the audience a campaign is not
    // aimed at.
    //
    // One outbox row per recipient, because the worker fans out by
    // `target_user_id`. Going through the outbox rather than calling FCM here
    // buys the retry, backoff and dead-token pruning the rest of the app
    // already has.
    await withTransaction(async (client) => {
      for (const userId of userIds) {
        await insertEvent(client, {
          aggregateType: OutboxAggregateType.CAMPAIGN,
          aggregateId: campaignId,
          eventType: OutboxEventType.PUSH_CAMPAIGN,
          payload: {
            campaign_id: campaignId,
            target_user_id: userId,
            title: claimed.title,
            body: claimed.body,
            deeplink: claimed.deeplink ?? '',
          },
        });
      }
    });

    // Nudge anyone with the app open so the panel and badge update without a
    // manual refresh. Best-effort — the rows are already durable.
    for (const userId of userIds) {
      publish(userId, { type: RealtimeEvent.NOTIFICATION_NEW });
      publish(userId, { type: RealtimeEvent.BADGES_CHANGED });
    }

    logger.info({ campaignId, recipients }, 'campaign sent');
  } catch (err) {
    await repo.markFailed(campaignId, err instanceof Error ? err.message : 'unknown error');
    logger.error({ err, campaignId }, 'campaign send failed');
    throw err;
  }
};
