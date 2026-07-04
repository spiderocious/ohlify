import { KNOWN_KYC_ITEM_KEYS, type KycItemKey } from '@features/onboarding/onboarding.types.js';
import { pool } from '@lib/db/pool.js';
import { logger } from '@lib/logger.js';
import { insertEvent, OutboxAggregateType, OutboxEventType } from '@lib/outbox/index.js';
import { decodeCursor, encodeCursor, resolveLimit } from '@lib/pagination.js';
import { ServiceError, ServiceSuccess } from '@lib/service-result.js';
import { MESSAGE_KEYS } from '@shared/constants/message-keys.js';

import * as repo from './admin.kyc.repo.js';
import type {
  AdminApproveKycDto,
  AdminListKycQueryDto,
  AdminRejectKycDto,
} from './admin.write.schema.js';

const KNOWN_KEY_SET = new Set<string>(KNOWN_KYC_ITEM_KEYS);

/**
 * Normalize the admin-supplied resubmission set. Drops unknown keys
 * (admin-web is the source of truth for which keys apply per role, but
 * we still defend against typos and stale clients), dedupes, and returns
 * null for empty input so we persist a NULL column rather than '{}'.
 */
const normalizeItemKeys = (raw: string[] | undefined): KycItemKey[] | null => {
  if (raw === undefined || raw.length === 0) return null;
  const cleaned: KycItemKey[] = [];
  const seen = new Set<string>();
  for (const candidate of raw) {
    if (!KNOWN_KEY_SET.has(candidate)) continue;
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    cleaned.push(candidate as KycItemKey);
  }
  return cleaned.length === 0 ? null : cleaned;
};

const toView = (row: repo.KycSubmissionAdminRow) => ({
  id: row.id,
  user_id: row.user_id,
  identity_type: row.identity_type,
  identity_number: row.identity_number,
  document_upload_id: row.document_upload_id,
  selfie_upload_key: row.selfie_upload_key,
  status: row.status,
  reviewed_by: row.reviewed_by,
  reviewed_at: row.reviewed_at?.toISOString() ?? null,
  reject_reason_code: row.reject_reason_code,
  reject_note: row.reject_note,
  // Always emit an array (never null) so admin-web can treat it as a set
  // without nullish dances. Empty array = whole-submission rejection.
  reject_item_keys: row.reject_item_keys ?? [],
  created_at: row.created_at.toISOString(),
});

export const listSubmissions = async (dto: AdminListKycQueryDto) => {
  const limit = resolveLimit(dto.limit);
  let cursor: { last_id: string; last_sort_key: string } | undefined;
  if (dto.cursor !== undefined) {
    try {
      cursor = decodeCursor(dto.cursor);
    } catch {
      return new ServiceError('validation_error', MESSAGE_KEYS.ADMIN_KYC_LIST_FETCHED, 400, {
        cursor: ['Invalid cursor'],
      });
    }
  }
  const rows = await repo.list({
    limit,
    ...(cursor ? { cursor } : {}),
    ...(dto.status ? { status: dto.status } : {}),
  });
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor({ last_id: last.id, last_sort_key: last.created_at.toISOString() })
      : null;
  return new ServiceSuccess(
    {
      items: page.map(toView),
      meta: { next_cursor: nextCursor, has_more: hasMore },
    },
    MESSAGE_KEYS.ADMIN_KYC_LIST_FETCHED,
  );
};

// Approve flips the submission to approved AND sets users.kyc_status to
// approved. Both writes happen in the same tx so a failure in either
// rolls back. Stub-token writes pass adminId 'adm_stub' which we
// translate to NULL on the FK column.
export const approve = async (submissionId: string, _dto: AdminApproveKycDto, adminId: string) => {
  const reviewedBy = adminId === 'adm_stub' ? null : adminId;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const submission = await repo.findByIdForUpdate(client, submissionId);
    if (!submission) {
      await client.query('ROLLBACK');
      return new ServiceError('not_found', MESSAGE_KEYS.ADMIN_KYC_APPROVED, 404);
    }
    if (submission.status === 'approved') {
      await client.query('ROLLBACK');
      return new ServiceError('conflict', MESSAGE_KEYS.ADMIN_KYC_APPROVED, 409, {
        status: ['Submission already approved'],
      });
    }
    await repo.setApproved(client, submission.id, reviewedBy);
    // Approve flips kyc_status AND promotes the user to `professional`.
    // Spec: "user role flips to professional, kyc_status: approved, profile
    // goes live in search". We don't downgrade an already-professional user
    // (re-approval is a no-op on the role column).
    await client.query(
      `UPDATE users
         SET kyc_status = 'approved'::kyc_status,
             kyc_reviewed_at = now(),
             kyc_reject_reason = NULL,
             role = CASE WHEN role = 'professional' THEN role ELSE 'professional'::user_role END,
             updated_at = now()
         WHERE id = $1`,
      [submission.user_id],
    );
    // Outbox: kyc.approved — picked up by the notification fanout worker
    // (push + email per the spec). Inside the same tx so the event only
    // fires iff the role flip commits.
    await insertEvent(client, {
      aggregateType: OutboxAggregateType.USER,
      aggregateId: submission.user_id,
      eventType: OutboxEventType.KYC_APPROVED,
      payload: {
        user_id: submission.user_id,
        submission_id: submission.id,
        reviewed_by: reviewedBy,
      },
    });
    await client.query('COMMIT');
    logger.info({ submissionId, userId: submission.user_id }, 'admin approved KYC');
    const fresh = await repo.findByIdForUpdate(client, submission.id);
    return new ServiceSuccess(toView(fresh!), MESSAGE_KEYS.ADMIN_KYC_APPROVED);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error({ err, submissionId }, 'admin approve kyc failed');
    throw err;
  } finally {
    client.release();
  }
};

export const reject = async (submissionId: string, dto: AdminRejectKycDto, adminId: string) => {
  const reviewedBy = adminId === 'adm_stub' ? null : adminId;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const submission = await repo.findByIdForUpdate(client, submissionId);
    if (!submission) {
      await client.query('ROLLBACK');
      return new ServiceError('not_found', MESSAGE_KEYS.ADMIN_KYC_REJECTED, 404);
    }
    if (submission.status === 'rejected') {
      await client.query('ROLLBACK');
      return new ServiceError('conflict', MESSAGE_KEYS.ADMIN_KYC_REJECTED, 409, {
        status: ['Submission already rejected'],
      });
    }
    const itemKeys = normalizeItemKeys(dto.item_keys);
    await repo.setRejected(client, submission.id, reviewedBy, dto.reason_code, dto.note, itemKeys);
    await client.query(
      `UPDATE users
         SET kyc_status = 'rejected'::kyc_status,
             kyc_reviewed_at = now(),
             kyc_reject_reason = $2,
             updated_at = now()
         WHERE id = $1`,
      [submission.user_id, dto.reason_code],
    );
    // Outbox payload is consumed by the notification worker to trigger
    // email / push. We carry enough context for templates to render a
    // useful subject line + body and to deep-link the user back into the
    // app at the rejection screen.
    //
    // Intentionally omitted: `note` (admin-internal free text — the
    // user-facing rejection screen pulls it via GET /onboarding/status,
    // so it's not duplicated into the worker payload where it could leak
    // into a third-party email-provider's dashboard logs).
    //
    // Included: `item_keys` so a future template can say "please update
    // your selfie" instead of generic copy. Empty array = reject-all.
    await insertEvent(client, {
      aggregateType: OutboxAggregateType.USER,
      aggregateId: submission.user_id,
      eventType: OutboxEventType.KYC_REJECTED,
      payload: {
        user_id: submission.user_id,
        submission_id: submission.id,
        reason_code: dto.reason_code,
        item_keys: itemKeys ?? [],
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewedBy,
      },
    });
    await client.query('COMMIT');
    logger.info(
      {
        submissionId,
        userId: submission.user_id,
        reasonCode: dto.reason_code,
        itemKeyCount: itemKeys?.length ?? 0,
      },
      'admin rejected KYC',
    );
    const fresh = await repo.findByIdForUpdate(client, submission.id);
    return new ServiceSuccess(toView(fresh!), MESSAGE_KEYS.ADMIN_KYC_REJECTED);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error({ err, submissionId }, 'admin reject kyc failed');
    throw err;
  } finally {
    client.release();
  }
};
