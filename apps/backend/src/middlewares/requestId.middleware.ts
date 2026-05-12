import type { Request, Response, NextFunction } from 'express';

import { requestContext } from '@lib/http/requestContext.js';
import { newRawId } from '@lib/ids.js';

// Seeds AsyncLocalStorage with the request envelope. Every other middleware,
// service, and repo can read/extend the context via `requestContext.get()`.
// Auth middlewares enrich it with userId/role/adminId once they run.
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = (req.headers['x-request-id'] as string | undefined) ?? newRawId();
  res.setHeader('x-request-id', requestId);

  requestContext.run(
    {
      requestId,
      method: req.method,
      path: req.originalUrl,
      ip: req.ip,
      userAgent: req.header('user-agent'),
      startedAt: Date.now(),
    },
    next,
  );
};
