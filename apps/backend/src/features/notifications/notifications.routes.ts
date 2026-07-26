import { Router } from 'express';
import type { Express } from 'express';

import { validate } from '@lib/http/validateRequest.js';
import { requireAuth } from '@middlewares/auth.middleware.js';
import { requireActiveUser } from '@middlewares/requireActiveUser.middleware.js';

import * as controller from './notifications.controller.js';
import { ListNotificationsQuerySchema } from './notifications.schema.js';

export const register = (app: Express): void => {
  const router = Router();
  router.use(requireAuth, requireActiveUser);

  router.get('/notifications', validate(ListNotificationsQuerySchema, 'query'), controller.list);
  router.post('/notifications/read-all', controller.markAllRead);
  router.post('/notifications/:id/read', controller.markRead);

  // One read for every badge. Four endpoints would become four polling loops.
  router.get('/badges', controller.badges);
  router.post('/surfaces/:surface/seen', controller.markSurfaceSeen);

  app.use('/api/v1/me', router);
};
