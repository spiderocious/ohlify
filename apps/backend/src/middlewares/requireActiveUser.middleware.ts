import type { Request, Response, NextFunction } from 'express';

import { pool } from '@lib/db/pool.js';
import { AppError, UnauthorizedError } from '@lib/errors.js';

// Confirms the JWT-derived userId still resolves to a non-deleted user. Must
// run AFTER requireAuth (which populates req.userId). Closes the soft-deleted-
// JWT-still-works window flagged by QA in the onboarding+profile report (F-02).
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
    const res = await pool.query<{ deleted_at: Date | null }>(
      'SELECT deleted_at FROM users WHERE id = $1 LIMIT 1',
      [userId],
    );
    const row = res.rows[0];
    if (!row || row.deleted_at !== null) {
      next(new AppError('token_invalid', 'Account no longer exists', 401));
      return;
    }
    next();
  } catch (err) {
    next(err);
  }
};
