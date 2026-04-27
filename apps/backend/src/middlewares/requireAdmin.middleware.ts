import crypto from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

import { UnauthorizedError } from '@lib/errors.js';

import { env } from '../env.js';

// ⚠️ STUB ADMIN AUTH — REPLACE IN §21 ADMIN SLICE
//
// All admin endpoints in this bundle are gated by a single shared bearer-
// style token in the `X-Admin-Token` header (compared via timingSafeEqual).
// This is intentionally simple — proper admin auth (TOTP-backed, per-admin
// audit trails, RBAC) ships with the §21 admin dashboard slice.
//
// Production hardening required before launch:
//   1. Replace this middleware with the real admin auth from §21.
//   2. Drop ADMIN_STUB_TOKEN from env.
//   3. Every admin route also wires admin_audit_log writes (deferred — the
//      audit-log table doesn't exist yet, lands with §21).
//
// In the meantime, the token must be a long random secret in production.
export const requireAdmin = (req: Request, _res: Response, next: NextFunction): void => {
  const provided = req.header('x-admin-token');
  if (!provided) {
    next(new UnauthorizedError('Missing X-Admin-Token header'));
    return;
  }
  const expected = env.ADMIN_STUB_TOKEN;
  if (provided.length !== expected.length) {
    next(new UnauthorizedError('Invalid admin token'));
    return;
  }
  if (!crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) {
    next(new UnauthorizedError('Invalid admin token'));
    return;
  }
  next();
};
