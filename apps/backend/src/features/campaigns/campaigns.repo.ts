import type { SegmentPredicate } from '@features/banners/banner-segments.js';
import { compileSegment } from '@features/banners/banner-segments.js';
import { pool } from '@lib/db/pool.js';
import { id as makeId } from '@lib/ids.js';

import { CampaignStatus, type CampaignRow } from './campaigns.types.js';

export const create = async (input: {
  title: string;
  body: string | null;
  deeplink: string | null;
  segment: SegmentPredicate;
  createdBy: string | null;
}): Promise<CampaignRow> => {
  const res = await pool.query<CampaignRow>(
    `INSERT INTO campaigns (id, title, body, deeplink, segment, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      makeId('cmp'),
      input.title,
      input.body,
      input.deeplink,
      JSON.stringify(input.segment),
      input.createdBy,
    ],
  );
  return res.rows[0]!;
};

export const findById = async (campaignId: string): Promise<CampaignRow | null> => {
  const res = await pool.query<CampaignRow>(`SELECT * FROM campaigns WHERE id = $1 LIMIT 1`, [
    campaignId,
  ]);
  return res.rows[0] ?? null;
};

export const listAll = async (limit: number): Promise<CampaignRow[]> => {
  const res = await pool.query<CampaignRow>(
    `SELECT * FROM campaigns ORDER BY created_at DESC LIMIT $1`,
    [limit],
  );
  return res.rows;
};

/**
 * Moves a campaign to `scheduled` only from `draft`.
 *
 * Guarded in the WHERE so two admins hitting send at once cannot queue the same
 * campaign twice — the second update matches nothing and returns null.
 */
export const markScheduled = async (
  campaignId: string,
  jobId: string,
  sendAt: Date,
): Promise<CampaignRow | null> => {
  const res = await pool.query<CampaignRow>(
    `UPDATE campaigns
        SET status = '${CampaignStatus.SCHEDULED}', job_id = $2, send_at = $3, updated_at = now()
      WHERE id = $1 AND status = '${CampaignStatus.DRAFT}'
      RETURNING *`,
    [campaignId, jobId, sendAt],
  );
  return res.rows[0] ?? null;
};

export const markCancelled = async (campaignId: string): Promise<CampaignRow | null> => {
  const res = await pool.query<CampaignRow>(
    `UPDATE campaigns
        SET status = '${CampaignStatus.CANCELLED}', updated_at = now()
      WHERE id = $1 AND status = '${CampaignStatus.SCHEDULED}'
      RETURNING *`,
    [campaignId],
  );
  return res.rows[0] ?? null;
};

/**
 * Claims a campaign for sending.
 *
 * The `status = 'scheduled'` guard is the race the PRD calls out: a BullMQ job
 * already in flight cannot be un-started by `job.remove()`, so the worker
 * re-checks here. A cancelled campaign fails this update and is never sent.
 */
export const claimForSending = async (campaignId: string): Promise<CampaignRow | null> => {
  const res = await pool.query<CampaignRow>(
    `UPDATE campaigns
        SET status = '${CampaignStatus.SENDING}', updated_at = now()
      WHERE id = $1 AND status = '${CampaignStatus.SCHEDULED}'
      RETURNING *`,
    [campaignId],
  );
  return res.rows[0] ?? null;
};

export const markSent = async (campaignId: string, recipients: number): Promise<void> => {
  await pool.query(
    `UPDATE campaigns
        SET status = '${CampaignStatus.SENT}', recipients = $2, sent_at = now(), updated_at = now()
      WHERE id = $1`,
    [campaignId, recipients],
  );
};

export const markFailed = async (campaignId: string, error: string): Promise<void> => {
  await pool.query(
    `UPDATE campaigns
        SET status = '${CampaignStatus.FAILED}', error = $2, updated_at = now()
      WHERE id = $1`,
    [campaignId, error.slice(0, 500)],
  );
};

/**
 * Writes one notification per targeted user, in a single statement.
 *
 * `INSERT ... SELECT` rather than a loop: at ten thousand users this is one
 * round trip measured in milliseconds, where per-row inserts would be ten
 * thousand. The segment is evaluated here, at send time, against live state.
 */
export const materialiseNotifications = async (input: {
  campaignId: string;
  title: string;
  body: string | null;
  deeplink: string | null;
  segment: SegmentPredicate;
}): Promise<number> => {
  const { sql, params } = compileSegment(input.segment, 5);
  const res = await pool.query(
    `INSERT INTO notifications (id, user_id, kind, title, body, deeplink, metadata)
     -- Ids are generated in SQL so ten thousand rows are one statement rather
     -- than ten thousand round trips. Same 'n_' prefix as the app-side ids.
     SELECT 'n_' || encode(gen_random_bytes(13), 'hex'),
            u.id,
            'campaign',
            $1, $2, $3,
            jsonb_build_object('campaign_id', $4::text)
       FROM users u
      WHERE u.deleted_at IS NULL AND (${sql})`,
    [input.title, input.body, input.deeplink, input.campaignId, ...params],
  );
  return res.rowCount ?? 0;
};

/** Who the send reached — used to fan out push after the rows land. */
export const listRecipients = async (campaignId: string): Promise<string[]> => {
  const res = await pool.query<{ user_id: string }>(
    `SELECT user_id FROM notifications
      WHERE kind = 'campaign' AND metadata->>'campaign_id' = $1`,
    [campaignId],
  );
  return res.rows.map((r) => r.user_id);
};
