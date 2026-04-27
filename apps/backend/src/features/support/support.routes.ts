import { Router } from 'express';
import type { Express } from 'express';

import { validate } from '@lib/http/validateRequest.js';
import { rateLimitMiddleware } from '@lib/redis/rateLimit.js';
import { requireAuth } from '@middlewares/auth.middleware.js';
import { requireActiveUser } from '@middlewares/requireActiveUser.middleware.js';

import * as controller from './support.controller.js';
import { CreateTicketSchema } from './support.schema.js';

export const register = (app: Express): void => {
  const router = Router();
  router.use(requireAuth, requireActiveUser);

  router.get('/faqs', controller.listFaqs);
  router.get('/contact', controller.getContact);
  router.post(
    '/tickets',
    rateLimitMiddleware((req) => `tickets:${req.userId ?? 'anon'}`, 10, 3600),
    validate(CreateTicketSchema),
    controller.createTicket,
  );

  app.use('/api/v1/help', router);
};
