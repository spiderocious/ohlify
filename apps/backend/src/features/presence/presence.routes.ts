import { Router } from 'express';
import type { Express } from 'express';

import { requireAuth } from '@middlewares/auth.middleware.js';
import { requireActiveUser } from '@middlewares/requireActiveUser.middleware.js';

import * as controller from './presence.controller.js';

// The heartbeat endpoint is gone: reachability now rests on push tokens and the
// pro's own availability switch, so there was nothing left for a liveness ping
// to decide. See docs/revamp-2/prd.md §2.4.
export const register = (app: Express): void => {
  const proRouter = Router();
  proRouter.use(requireAuth, requireActiveUser);
  proRouter.get('/:id/presence', controller.getForPro);
  app.use('/api/v1/professionals', proRouter);
};
