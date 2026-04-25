import type { Request, Response, NextFunction } from 'express';

import { UnauthorizedError } from '@lib/errors.js';
import { requestContext } from '@lib/http/requestContext.js';
import { verifyAccessToken } from '@lib/security/jwt.js';

export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(new UnauthorizedError('Missing or malformed Authorization header'));
    return;
  }

  const token = header.slice(7);
  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.sub;
    req.userRole = payload.role;
    const ctx = requestContext.get();
    if (ctx !== undefined) {
      ctx.userId = payload.sub;
      ctx.role = payload.role;
    }
    next();
  } catch (err) {
    next(err);
  }
};

export const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    const token = header.slice(7);
    try {
      const payload = verifyAccessToken(token);
      req.userId = payload.sub;
      req.userRole = payload.role;
      const ctx = requestContext.get();
      if (ctx !== undefined) {
        ctx.userId = payload.sub;
        ctx.role = payload.role;
      }
    } catch {
      // silently ignore — optional
    }
  }
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
