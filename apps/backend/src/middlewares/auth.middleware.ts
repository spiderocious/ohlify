import type { Request, Response, NextFunction } from 'express';

import { UnauthorizedError } from '@lib/errors.js';

// Placeholder — full JWT verification implemented in the auth feature doc.
// Attaches userId to request context on success.
export const requireAuth = (_req: Request, _res: Response, next: NextFunction): void => {
  // TODO: implement in auth.md — verify Bearer JWT, set userId in requestContext
  next(new UnauthorizedError('Auth middleware not yet implemented'));
};

export const optionalAuth = (_req: Request, _res: Response, next: NextFunction): void => {
  // TODO: implement in auth.md — try to verify JWT, silently skip on failure
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
