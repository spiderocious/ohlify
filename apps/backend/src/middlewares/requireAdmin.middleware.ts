import crypto from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

import { type AdminRole, verifyAdminAccessToken } from '@lib/admin-auth/index.js';
import { AppError, UnauthorizedError } from '@lib/errors.js';

import { env } from '../env.js';

// Admin auth — accepts EITHER:
//   1. Authorization: Bearer <admin_jwt>  (the new path; sets req.adminId + req.adminRole)
//   2. X-Admin-Token: <stub_token>        (legacy fallback for dev tools; sets req.adminId='adm_stub')
//
// Once the admin web UI fully migrates to JWT, drop the stub fallback. The
// fallback is what keeps test-area-web tools working during the transition.
//
// Per-route role gating is layered on top of this via `requireAdminRole(['admin','support'])`
// — see below.
export const requireAdmin = (req: Request, _res: Response, next: NextFunction): void => {
  const bearer = req.header('authorization');
  if (bearer && bearer.startsWith('Bearer ')) {
    const token = bearer.slice('Bearer '.length).trim();
    try {
      const payload = verifyAdminAccessToken(token);
      req.adminId = payload.sub;
      req.adminRole = payload.role;
      next();
      return;
    } catch {
      next(new AppError('token_invalid', 'Invalid or expired admin token', 401));
      return;
    }
  }

  // Legacy stub-token fallback. Same constant-time compare as before.
  const stub = req.header('x-admin-token');
  if (!stub) {
    next(new UnauthorizedError('Missing admin credentials'));
    return;
  }
  const expected = env.ADMIN_STUB_TOKEN;
  if (stub.length !== expected.length) {
    next(new UnauthorizedError('Invalid admin token'));
    return;
  }
  if (!crypto.timingSafeEqual(Buffer.from(stub), Buffer.from(expected))) {
    next(new UnauthorizedError('Invalid admin token'));
    return;
  }
  // Stub auth maps to a synthetic admin id. Audit log writes that key off
  // req.adminId need to handle this case (skip-or-tag).
  req.adminId = 'adm_stub';
  req.adminRole = 'admin'; // stub is omnipotent
  next();
};

// Per-route role check. Use as a second middleware after requireAdmin:
//   router.post('/users/:id/suspend', requireAdmin, requireAdminRole(['admin','support']), ...)
export const requireAdminRole =
  (allowed: readonly AdminRole[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.adminRole) {
      next(new UnauthorizedError('Admin role missing — requireAdmin must run first'));
      return;
    }
    // Stub auth is omnipotent (legacy). Dev-tool only — production stub
    // token must be unset.
    if (req.adminId === 'adm_stub') {
      next();
      return;
    }
    if (!allowed.includes(req.adminRole as AdminRole)) {
      next(new AppError('forbidden', `Requires admin role one of: ${allowed.join(', ')}`, 403));
      return;
    }
    next();
  };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      adminId?: string;
      adminRole?: string;
    }
  }
}
