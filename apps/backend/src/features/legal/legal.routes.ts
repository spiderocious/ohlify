import { Router } from 'express';
import type { Express } from 'express';

import { requireAuth } from '@middlewares/auth.middleware.js';
import { requireActiveUser } from '@middlewares/requireActiveUser.middleware.js';

import * as controller from './legal.controller.js';

export const register = (app: Express): void => {
  const router = Router();
  router.use(requireAuth, requireActiveUser);
  router.get('/eula', controller.getEula);
  router.get('/privacy', controller.getPrivacy);
  router.get('/terms', controller.getTerms);
  app.use('/api/v1/legal', router);
};
