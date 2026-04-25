import type { Request, Response, NextFunction } from 'express';

import { requestContext } from '@lib/http/requestContext.js';
import { newRawId } from '@lib/ids.js';

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = (req.headers['x-request-id'] as string | undefined) ?? newRawId();
  res.setHeader('x-request-id', requestId);
  requestContext.run({ requestId }, next);
};
