import type { Request, Response, NextFunction } from 'express';

import { pool } from '@lib/db/pool.js';
import { AppError, UnauthorizedError } from '@lib/errors.js';

// Confirms the JWT-derived userId still resolves to an active, undeleted
// user. Must run AFTER requireAuth (which populates req.userId).
//
// Originally written for F-02 (soft-delete window) and only checked
// deleted_at. C-NEW-05 found that suspended/blocked users could still hit
// authed routes via existing tokens. This middleware now also rejects
// non-active statuses with `account_suspended` / `account_blocked`.
//
// Routes that should remain accessible while suspended (e.g. strikes
// dispute endpoints, so a banned pro can dispute their way out) MUST use
// `requireAuth` only and NOT add this middleware. See
// features/strikes/strikes.routes.ts for the canonical example.
export const requireActiveUser = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = req.userId;
  if (!userId) {
    next(new UnauthorizedError('Authentication required'));
    return;
  }
  try {
    const res = await pool.query<{ status: string; deleted_at: Date | null }>(
      'SELECT status::text AS status, deleted_at FROM users WHERE id = $1 LIMIT 1',
      [userId],
    );
    const row = res.rows[0];
    if (!row || row.deleted_at !== null) {
      next(new AppError('token_invalid', 'Account no longer exists', 401));
      return;
    }
    if (row.status === 'suspended') {
      next(new AppError('account_suspended', 'Account is suspended', 403));
      return;
    }
    if (row.status === 'blocked') {
      next(new AppError('account_blocked', 'Account is blocked', 403));
      return;
    }
    if (row.status !== 'active') {
      next(new AppError('token_invalid', 'Account not in active state', 401));
      return;
    }
    next();
  } catch (err) {
    next(err);
  }
};
