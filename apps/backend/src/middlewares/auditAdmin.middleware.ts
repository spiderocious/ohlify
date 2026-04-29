import type { NextFunction, Request, Response } from 'express';

import * as auditRepo from '@features/admin/admin.audit.repo.js';
import { logger } from '@lib/logger.js';

// Append-only audit log of admin write actions. Mounted on a per-route
// basis (or on the admin write router), AFTER requireAdmin so req.adminId
// is set.
//
// We log on response finish (so we have the final status). The action
// string is passed in by the caller — `users.suspend`, `wallets.credit`,
// etc. The middleware captures req.params + a redacted body as metadata.
//
// Stub-token writes (req.adminId === 'adm_stub') do not have an
// admin_users row, and admin_audit_log.admin_user_id has a FK; we record
// the row with admin_user_id NULL and stash 'adm_stub' in metadata so
// the audit trail isn't lost.
//
// We never block the request on audit-log write failure — log + move on.

const SENSITIVE_KEYS = new Set([
  'password',
  'old_password',
  'new_password',
  'token',
  'totp_code',
  'refresh_token',
]);

const redact = (obj: unknown): unknown => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(redact);
  if (typeof obj !== 'object') return obj;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(k)) {
      out[k] = '[REDACTED]';
    } else {
      out[k] = redact(v);
    }
  }
  return out;
};

export interface AuditOptions {
  // Action code — e.g. 'users.suspend', 'wallets.credit'.
  action: string;
  // Optional: derive the target_id from req. Defaults to req.params.id.
  targetIdFrom?: (req: Request) => string | null;
  // Optional: target_type — e.g. 'user', 'withdrawal', 'call'.
  targetType?: string;
  // Optional: include the response body in metadata. Off by default —
  // most write responses just echo what we already captured from the
  // request.
  includeResponseBody?: boolean;
}

export const auditAdmin =
  (opts: AuditOptions) =>
  (req: Request, res: Response, next: NextFunction): void => {
    res.on('finish', () => {
      // Only log successful writes (2xx). 4xx/5xx aren't actions taken.
      if (res.statusCode < 200 || res.statusCode >= 300) return;

      const adminId = req.adminId;
      const isStub = adminId === 'adm_stub';
      const rawTargetId = opts.targetIdFrom ? opts.targetIdFrom(req) : (req.params['id'] ?? null);
      let targetId: string | null = null;
      if (typeof rawTargetId === 'string') targetId = rawTargetId;
      else if (Array.isArray(rawTargetId)) targetId = rawTargetId[0] ?? null;

      const metadata: Record<string, unknown> = {
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        params: req.params,
        body: redact(req.body),
      };
      if (isStub) metadata['stub_admin'] = true;

      auditRepo
        .insert({
          adminUserId: isStub ? null : (adminId ?? null),
          action: opts.action,
          targetType: opts.targetType ?? null,
          targetId: targetId ?? null,
          metadata,
          ipAddress: req.ip ?? null,
          userAgent: req.header('user-agent') ?? null,
        })
        .catch((err: unknown) => {
          logger.error({ err, action: opts.action }, 'admin audit log write failed');
        });
    });
    next();
  };
