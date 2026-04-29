import { pool } from '@lib/db/pool.js';
import { logger } from '@lib/logger.js';
import { decodeCursor, encodeCursor, resolveLimit } from '@lib/pagination.js';
import { ServiceError, ServiceSuccess } from '@lib/service-result.js';
import { MESSAGE_KEYS } from '@shared/constants/message-keys.js';

import * as repo from './admin.kyc.repo.js';
import type {
  AdminApproveKycDto,
  AdminListKycQueryDto,
  AdminRejectKycDto,
} from './admin.write.schema.js';

const toView = (row: repo.KycSubmissionAdminRow) => ({
  id: row.id,
  user_id: row.user_id,
  identity_type: row.identity_type,
  identity_number: row.identity_number,
  document_upload_id: row.document_upload_id,
  status: row.status,
  reviewed_by: row.reviewed_by,
  reviewed_at: row.reviewed_at?.toISOString() ?? null,
  reject_reason_code: row.reject_reason_code,
  reject_note: row.reject_note,
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
    await client.query(
      `UPDATE users
         SET kyc_status = 'approved'::kyc_status,
             kyc_reviewed_at = now(),
             kyc_reject_reason = NULL,
             updated_at = now()
         WHERE id = $1`,
      [submission.user_id],
    );
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
    await repo.setRejected(client, submission.id, reviewedBy, dto.reason_code, dto.note);
    await client.query(
      `UPDATE users
         SET kyc_status = 'rejected'::kyc_status,
             kyc_reviewed_at = now(),
             kyc_reject_reason = $2,
             updated_at = now()
         WHERE id = $1`,
      [submission.user_id, dto.reason_code],
    );
    await client.query('COMMIT');
    logger.info(
      { submissionId, userId: submission.user_id, reasonCode: dto.reason_code },
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
