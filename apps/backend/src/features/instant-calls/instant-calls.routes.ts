import { Router } from 'express';
import type { Express } from 'express';

import { validate } from '@lib/http/validateRequest.js';
import { rateLimitMiddleware } from '@lib/redis/rateLimit.js';
import { requireAuth } from '@middlewares/auth.middleware.js';
import { requireActiveUser } from '@middlewares/requireActiveUser.middleware.js';

import * as controller from './instant-calls.controller.js';
import { EndCallSchema, StartCallSchema } from './instant-calls.schema.js';

export const register = (app: Express): void => {
  const router = Router();
  router.use(requireAuth, requireActiveUser);

  // Callee poll for an incoming (ringing) call — foreground.
  router.get('/incoming', controller.incoming);

  // Caller starts an instant call (preflight: minutes / online / DnD).
  router.post(
    '/',
    rateLimitMiddleware((req) => `instant-call-start:${req.userId ?? 'anon'}`, 30, 3600),
    validate(StartCallSchema),
    controller.start,
  );

  // Callee answers a ringing call.
  router.post('/:id/answer', controller.answer);

  // Either party ends (or cancels/declines) the call.
  router.post('/:id/end', validate(EndCallSchema), controller.end);

  app.use('/api/v1/instant-calls', router);
};
