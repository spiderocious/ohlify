import { decodeCursor, encodeCursor, resolveLimit } from '@lib/pagination.js';
import { ServiceError, ServiceSuccess } from '@lib/service-result.js';
import { MESSAGE_KEYS } from '@shared/constants/message-keys.js';

import * as repo from './admin.audit.repo.js';
import type { AdminListAuditLogQueryDto } from './admin.write.schema.js';

export const listAuditLog = async (dto: AdminListAuditLogQueryDto) => {
  const limit = resolveLimit(dto.limit);
  let cursor: { last_id: string; last_sort_key: string } | undefined;
  if (dto.cursor !== undefined) {
    try {
      cursor = decodeCursor(dto.cursor);
    } catch {
      return new ServiceError('validation_error', MESSAGE_KEYS.ADMIN_AUDIT_LOG_FETCHED, 400, {
        cursor: ['Invalid cursor'],
      });
    }
  }
  const rows = await repo.list({
    limit,
    ...(cursor ? { cursor } : {}),
    ...(dto.admin_user_id ? { adminUserId: dto.admin_user_id } : {}),
    ...(dto.action ? { action: dto.action } : {}),
    ...(dto.target_type ? { targetType: dto.target_type } : {}),
    ...(dto.target_id ? { targetId: dto.target_id } : {}),
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
      items: page.map((r) => ({
        id: r.id,
        admin_user_id: r.admin_user_id,
        action: r.action,
        target_type: r.target_type,
        target_id: r.target_id,
        metadata: r.metadata,
        ip_address: r.ip_address,
        user_agent: r.user_agent,
        created_at: r.created_at.toISOString(),
      })),
      meta: { next_cursor: nextCursor, has_more: hasMore },
    },
    MESSAGE_KEYS.ADMIN_AUDIT_LOG_FETCHED,
  );
};
