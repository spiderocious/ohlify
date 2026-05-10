import { Router } from 'express';
import type { Express } from 'express';

import { rateLimitMiddleware } from '@lib/redis/rateLimit.js';

import * as controller from './platform-config.controller.js';

// /platform-config/public is the only UNAUTHENTICATED endpoint outside auth itself.
// Mobile / web fetch this on cold start, before auth restore — so no Bearer.
// Per-IP rate limit only (60/min) since there's no userId yet.
export const register = (app: Express): void => {
  const router = Router();
  router.get(
    '/',
    rateLimitMiddleware((req) => `config-public:${req.ip ?? 'unknown'}`, 60, 60),
    controller.getPublic,
  );
  app.use('/api/v1/platform-config/public', router);
  app.use('/api/v1/test', router);
};
