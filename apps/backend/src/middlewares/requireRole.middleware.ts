import type { Request, Response, NextFunction, RequestHandler } from 'express';

import type { UserRole } from '@features/auth/auth.types.js';
import { ForbiddenError } from '@lib/errors.js';

// Gate a route to a specific role. Must run AFTER requireAuth (which populates
// req.userRole). 403 forbidden on mismatch.
export const requireRole =
  (role: UserRole): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (req.userRole !== role) {
      next(new ForbiddenError(`Endpoint requires role ${role}`));
      return;
    }
    next();
  };
