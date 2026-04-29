import type { PoolClient } from 'pg';

import { pool } from '@lib/db/pool.js';
import { id as newId } from '@lib/ids.js';

export interface InsertAuditLogInput {
  adminUserId: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditLogRow {
  id: string;
  admin_user_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
}

export const insert = async (
  input: InsertAuditLogInput,
  client?: PoolClient,
): Promise<AuditLogRow> => {
  const runner = client ?? pool;
  const auditId = newId('al');
  const res = await runner.query<AuditLogRow>(
    `INSERT INTO admin_audit_log
       (id, admin_user_id, action, target_type, target_id, metadata, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
     RETURNING *`,
    [
      auditId,
      input.adminUserId,
      input.action,
      input.targetType ?? null,
      input.targetId ?? null,
      JSON.stringify(input.metadata ?? {}),
      input.ipAddress ?? null,
      input.userAgent ?? null,
    ],
  );
  return res.rows[0]!;
};

export interface ListAuditLogQuery {
  limit: number;
  cursor?: { last_id: string; last_sort_key: string } | undefined;
  adminUserId?: string | undefined;
  action?: string | undefined;
  targetType?: string | undefined;
  targetId?: string | undefined;
}

export const list = async (q: ListAuditLogQuery): Promise<AuditLogRow[]> => {
  const params: unknown[] = [];
  const filters: string[] = [];
  if (q.adminUserId) {
    params.push(q.adminUserId);
    filters.push(`admin_user_id = $${params.length}`);
  }
  if (q.action) {
    params.push(q.action);
    filters.push(`action = $${params.length}`);
  }
  if (q.targetType) {
    params.push(q.targetType);
    filters.push(`target_type = $${params.length}`);
  }
  if (q.targetId) {
    params.push(q.targetId);
    filters.push(`target_id = $${params.length}`);
  }
  if (q.cursor) {
    params.push(q.cursor.last_sort_key);
    params.push(q.cursor.last_id);
    filters.push(
      `(created_at < $${params.length - 1}::timestamptz OR (created_at = $${params.length - 1}::timestamptz AND id < $${params.length}))`,
    );
  }
  params.push(q.limit + 1);
  const where = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
  const res = await pool.query<AuditLogRow>(
    `SELECT * FROM admin_audit_log
       ${where}
       ORDER BY created_at DESC, id DESC
       LIMIT $${params.length}`,
    params,
  );
  return res.rows;
};
