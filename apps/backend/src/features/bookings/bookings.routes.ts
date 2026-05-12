import { Router } from 'express';
import type { Express } from 'express';

import { validate } from '@lib/http/validateRequest.js';
import { rateLimitMiddleware } from '@lib/redis/rateLimit.js';
import { requireAuth } from '@middlewares/auth.middleware.js';
import { requireActiveUser } from '@middlewares/requireActiveUser.middleware.js';

import * as controller from './bookings.controller.js';
import {
  CancelBookingSchema,
  CreateBookingSchema,
  ListBookingsQuerySchema,
} from './bookings.schema.js';

export const register = (app: Express): void => {
  const router = Router();
  router.use(requireAuth, requireActiveUser);

  router.post(
    '/',
    rateLimitMiddleware((req) => `booking-create:${req.userId ?? 'anon'}`, 30, 600),
    validate(CreateBookingSchema),
    controller.create,
  );
  router.get('/', validate(ListBookingsQuerySchema, 'query'), controller.list);
  router.get('/:id', controller.get);
  router.post('/:id/cancel', validate(CancelBookingSchema), controller.cancel);

  app.use('/api/v1/bookings', router);
};
