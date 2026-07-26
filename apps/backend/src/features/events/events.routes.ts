import { Router } from 'express';
import type { Express } from 'express';

import { requireAuth } from '@middlewares/auth.middleware.js';

import * as controller from './events.controller.js';

// Deliberately NOT behind requireActiveUser: a suspended user's client should
// still receive the signal that their status changed. It is also not behind any
// enablement kill switch — the stream carries no capability of its own, and
// cutting it during maintenance would leave every open app silently stale.
export const register = (app: Express): void => {
  const router = Router();
  router.get('/', requireAuth, controller.stream);
  app.use('/api/v1/events', router);
};
