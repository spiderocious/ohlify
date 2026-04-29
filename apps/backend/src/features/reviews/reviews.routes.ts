import { Router } from 'express';
import type { Express } from 'express';

import { validate } from '@lib/http/validateRequest.js';
import { rateLimitMiddleware } from '@lib/redis/rateLimit.js';
import { auditAdmin } from '@middlewares/auditAdmin.middleware.js';
import { requireAuth } from '@middlewares/auth.middleware.js';
import { requireActiveUser } from '@middlewares/requireActiveUser.middleware.js';
import { requireAdmin } from '@middlewares/requireAdmin.middleware.js';

import * as controller from './reviews.controller.js';
import {
  AdminHideReviewSchema,
  AdminListReviewsQuerySchema,
  ListReviewsQuerySchema,
  PostRatingSchema,
} from './reviews.schema.js';

export const register = (app: Express): void => {
  // Authed: caller posts rating on a call.
  const callsRouter = Router();
  callsRouter.use(requireAuth, requireActiveUser);
  callsRouter.post(
    '/:id/rating',
    rateLimitMiddleware((req) => `review-create:${req.userId ?? 'anon'}`, 30, 3600),
    validate(PostRatingSchema),
    controller.postRating,
  );
  // Mount under /api/v1/calls so the path is POST /api/v1/calls/:id/rating
  app.use('/api/v1/calls', callsRouter);

  // Authed: my reviews given.
  // NOTE: register order matters — must be registered before profile/onboarding
  // shadow this prefix. Wired in app.ts ahead of those.
  const meRouter = Router();
  meRouter.use(requireAuth, requireActiveUser);
  meRouter.get('/reviews-given', validate(ListReviewsQuerySchema, 'query'), controller.listGiven);
  app.use('/api/v1/me', meRouter);

  // /professionals/:id/reviews is served by the professionals feature, which
  // delegates to reviewsService.listForProfessional. See
  // professionals.service.ts → `reviews()`. Don't double-mount here — that
  // would shadow the professionals router's auth + rate-limit middleware.

  // Admin: list + hide.
  const adminRouter = Router();
  adminRouter.use(requireAdmin);
  adminRouter.get('/', validate(AdminListReviewsQuerySchema, 'query'), controller.adminList);
  adminRouter.post(
    '/:id/hide',
    validate(AdminHideReviewSchema),
    auditAdmin({ action: 'reviews.hide', targetType: 'review' }),
    controller.adminHide,
  );
  app.use('/api/v1/admin/reviews', adminRouter);
};
