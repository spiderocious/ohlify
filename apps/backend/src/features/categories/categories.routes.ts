import { Router } from 'express';
import type { Express } from 'express';

import { requireAuth } from '@middlewares/auth.middleware.js';
import { requireActiveUser } from '@middlewares/requireActiveUser.middleware.js';

import * as controller from './categories.controller.js';

export const register = (app: Express): void => {
  const router = Router();
  router.use(requireAuth, requireActiveUser);
  router.get('/', controller.list);
  app.use('/api/v1/professional-categories', router);
};
