import { pool } from '@lib/db/pool.js';
import { logger } from '@lib/logger.js';
import { decodeCursor, encodeCursor, resolveLimit } from '@lib/pagination.js';
import { ServiceError, ServiceSuccess } from '@lib/service-result.js';
import { MESSAGE_KEYS, type MessageKey } from '@shared/constants/message-keys.js';

import * as repo from './admin.reports.repo.js';
import type {
  AdminDismissReportDto,
  AdminListReportsQueryDto,
  AdminResolveReportDto,
} from './admin.write.schema.js';

const toView = (row: repo.ReportRow) => ({
  id: row.id,
  reporter_user_id: row.reporter_user_id,
  target_type: row.target_type,
  target_id: row.target_id,
  reason_code: row.reason_code,
  description: row.description,
  status: row.status,
  reviewed_by: row.reviewed_by,
  reviewed_at: row.reviewed_at?.toISOString() ?? null,
  review_note: row.review_note,
  created_at: row.created_at.toISOString(),
});

export const listReports = async (dto: AdminListReportsQueryDto) => {
  const limit = resolveLimit(dto.limit);
  let cursor: { last_id: string; last_sort_key: string } | undefined;
  if (dto.cursor !== undefined) {
    try {
      cursor = decodeCursor(dto.cursor);
    } catch {
      return new ServiceError('validation_error', MESSAGE_KEYS.ADMIN_REPORTS_FETCHED, 400, {
        cursor: ['Invalid cursor'],
      });
    }
  }
  const rows = await repo.list({
    limit,
    ...(cursor ? { cursor } : {}),
    ...(dto.status ? { status: dto.status } : {}),
    ...(dto.target_type ? { target_type: dto.target_type } : {}),
    ...(dto.target_id ? { target_id: dto.target_id } : {}),
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
    MESSAGE_KEYS.ADMIN_REPORTS_FETCHED,
  );
};

const transitionReport = async (
  reportId: string,
  next: 'resolved' | 'dismissed',
  note: string,
  adminId: string,
  successKey: MessageKey,
) => {
  const reviewedBy = adminId === 'adm_stub' ? null : adminId;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const report = await repo.findByIdForUpdate(client, reportId);
    if (!report) {
      await client.query('ROLLBACK');
      return new ServiceError('not_found', successKey, 404);
    }
    if (report.status !== 'pending') {
      await client.query('ROLLBACK');
      return new ServiceError('conflict', successKey, 409, {
        status: [`Report is already ${report.status}`],
      });
    }
    await repo.setReviewed(client, report.id, next, reviewedBy, note);
    await client.query('COMMIT');
    logger.info({ reportId, next, adminId }, 'admin transitioned report');
    const fresh = await repo.findByIdForUpdate(client, report.id);
    return new ServiceSuccess(toView(fresh!), successKey);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error({ err, reportId }, 'admin transition report failed');
    throw err;
  } finally {
    client.release();
  }
};

export const resolveReport = async (
  reportId: string,
  dto: AdminResolveReportDto,
  adminId: string,
) => transitionReport(reportId, 'resolved', dto.note, adminId, MESSAGE_KEYS.ADMIN_REPORT_RESOLVED);

export const dismissReport = async (
  reportId: string,
  dto: AdminDismissReportDto,
  adminId: string,
) =>
  transitionReport(reportId, 'dismissed', dto.note, adminId, MESSAGE_KEYS.ADMIN_REPORT_DISMISSED);
