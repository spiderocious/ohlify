import { Router } from 'express';
import type { Express } from 'express';

import { rateLimitMiddleware } from '@lib/redis/rateLimit.js';
import { requireAuth } from '@middlewares/auth.middleware.js';
import { requireActiveUser } from '@middlewares/requireActiveUser.middleware.js';

import * as controller from './presence.controller.js';

export const register = (app: Express): void => {
  // Pro heartbeat under /me.
  const meRouter = Router();
  meRouter.use(requireAuth, requireActiveUser);
  meRouter.post(
    '/heartbeat',
    rateLimitMiddleware((req) => `presence-hb:${req.userId ?? 'anon'}`, 120, 60),
    controller.heartbeat,
  );
  app.use('/api/v1/me/presence', meRouter);

  // Read a professional's presence (any authed user, before dialling).
  const proRouter = Router();
  proRouter.use(requireAuth, requireActiveUser);
  proRouter.get('/:id/presence', controller.getForPro);
  app.use('/api/v1/professionals', proRouter);
};
