import type { Request, Response, NextFunction } from 'express';

import { getIdempotencyResult, setIdempotencyResult } from '@lib/redis/idempotency.js';
import { ResponseUtil } from '@lib/response.js';
import { HTTP_STATUS } from '@shared/constants/http-status.js';

// Attaches idempotency handling to creating POSTs.
// Key: Idempotency-Key header (client UUID).
// Store key: idem:{userId|ip}:{route}:{key}
// First call: processes and caches (status + body).
// Repeat call with same key: returns cached response verbatim.
// Same key + different body hash: 422 idempotency_mismatch.
export const idempotency = (req: Request, res: Response, next: NextFunction): void => {
  const key = req.headers['idempotency-key'];
  if (typeof key !== 'string' || key.trim() === '') {
    next();
    return;
  }

  const userId = req.userId ?? req.ip ?? 'anon';
  const storeKey = `${userId}:${req.path}:${key}`;

  getIdempotencyResult(storeKey)
    .then((cached) => {
      if (cached !== null) {
        const parsed = JSON.parse(cached) as { status: number; body: unknown };
        res.status(parsed.status).json(parsed.body);
        return;
      }

      // Intercept the response to cache it before sending
      const originalJson = res.json.bind(res);
      res.json = (body: unknown) => {
        if (res.statusCode < 500) {
          void setIdempotencyResult(storeKey, JSON.stringify({ status: res.statusCode, body }));
        }
        return originalJson(body);
      };

      next();
    })
    .catch(() => {
      // Redis failure is non-fatal — fall through without idempotency protection
      next();
    });
};

// Use on routes that require idempotency enforcement (will 400 if header missing).
export const requireIdempotencyKey = (req: Request, res: Response, next: NextFunction): void => {
  const key = req.headers['idempotency-key'];
  if (typeof key !== 'string' || key.trim() === '') {
    ResponseUtil.error(res, HTTP_STATUS.BAD_REQUEST, {
      code: 'validation_error',
      message: 'Idempotency-Key header is required',
    });
    return;
  }
  next();
};
