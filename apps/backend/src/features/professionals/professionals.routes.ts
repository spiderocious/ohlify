import { Router } from 'express';
import type { Express } from 'express';

import { validate } from '@lib/http/validateRequest.js';
import { rateLimitMiddleware } from '@lib/redis/rateLimit.js';
import { requireAuth } from '@middlewares/auth.middleware.js';
import { requireActiveUser } from '@middlewares/requireActiveUser.middleware.js';

import * as controller from './professionals.controller.js';
import {
  AvailabilityQuerySchema,
  ListQuerySchema,
  ProfessionalIdParamSchema,
  ReviewsQuerySchema,
} from './professionals.schema.js';

export const register = (app: Express): void => {
  const proRouter = Router();

  proRouter.use(requireAuth, requireActiveUser);

  proRouter.get(
    '/',
    rateLimitMiddleware((req) => `prof-list:${req.userId ?? req.ip ?? 'anon'}`, 120, 60),
    validate(ListQuerySchema, 'query'),
    controller.list,
  );

  proRouter.get(
    '/:id',
    rateLimitMiddleware((req) => `prof-detail:${req.userId ?? req.ip ?? 'anon'}`, 200, 60),
    validate(ProfessionalIdParamSchema, 'params'),
    controller.detail,
  );

  proRouter.get(
    '/:id/rates',
    rateLimitMiddleware((req) => `prof-detail:${req.userId ?? req.ip ?? 'anon'}`, 200, 60),
    validate(ProfessionalIdParamSchema, 'params'),
    controller.rates,
  );

  proRouter.get(
    '/:id/reviews',
    rateLimitMiddleware((req) => `prof-detail:${req.userId ?? req.ip ?? 'anon'}`, 200, 60),
    validate(ProfessionalIdParamSchema, 'params'),
    validate(ReviewsQuerySchema, 'query'),
    controller.reviews,
  );

  proRouter.get(
    '/:id/availability',
    rateLimitMiddleware((req) => `prof-availability:${req.userId ?? req.ip ?? 'anon'}`, 60, 60),
    validate(ProfessionalIdParamSchema, 'params'),
    validate(AvailabilityQuerySchema, 'query'),
    controller.availability,
  );

  app.use('/api/v1/professionals', proRouter);

  // /home is a sibling endpoint that orchestrates pros + categories.
  const homeRouter = Router();
  homeRouter.use(requireAuth, requireActiveUser);
  homeRouter.get(
    '/',
    rateLimitMiddleware((req) => `home:${req.userId ?? req.ip ?? 'anon'}`, 120, 60),
    controller.home,
  );
  app.use('/api/v1/home', homeRouter);
};
