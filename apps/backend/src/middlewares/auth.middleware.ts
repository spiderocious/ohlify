import type { Request, Response, NextFunction } from 'express';

import { UnauthorizedError } from '@lib/errors.js';

// Placeholder — replaced wholesale by the auth feature implementation.
export const requireAuth = (_req: Request, _res: Response, next: NextFunction): void => {
  next(new UnauthorizedError('Auth not yet implemented'));
};

export const optionalAuth = (_req: Request, _res: Response, next: NextFunction): void => {
  next();
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: string;
    }
  }
}
