import { ADMIN_EP, type AdminAuditLogEntry } from '@ohlify/api';

import { useCursorList } from '../../../shared/api/use-cursor-list.js';

type AuditFilters = {
  action?: string;
  target_type?: string;
  target_id?: string;
  admin_user_id?: string;
  [k: string]: string | undefined;
};

export function useAuditLog(filters: AuditFilters) {
  return useCursorList<AdminAuditLogEntry>({
    key: ['admin', 'audit-log'],
    url: ADMIN_EP.AUDIT_LOG,
    filters,
  });
}
