import { Router } from 'express';
import type { Express } from 'express';

import { validate } from '@lib/http/validateRequest.js';
import { auditAdmin } from '@middlewares/auditAdmin.middleware.js';
import { requireAuth } from '@middlewares/auth.middleware.js';
import { requireAdmin, requireAdminRole } from '@middlewares/requireAdmin.middleware.js';

const ADMIN_ONLY = ['admin'] as const;

import * as controller from './banners.controller.js';
import {
  CreateBannerSchema,
  ListBannersAdminQuerySchema,
  ListBannersPublicQuerySchema,
  UpdateBannerSchema,
} from './banners.schema.js';

export const register = (app: Express): void => {
  // /api/v1/public/banners — no-auth variant for guests / web-landing.
  // Same view shape, no userId required. Sensitive only-internal fields
  // are already stripped by toPublicView at the service layer.
  //
  // MUST be registered before the authed router below. Previously the authed
  // router was mounted at `/api/v1/` with a router-level `requireAuth`, so
  // Express entered it (and 401'd) for EVERY `/api/v1/*` path — including this
  // guest route — before this mount was ever reached. (banners-home.bugs.md
  // BUG-banners-home-01.)
  const pub = Router();
  pub.get('/', validate(ListBannersPublicQuerySchema, 'query'), controller.publicList);
  app.use('/api/v1/public/banners', pub);

  // /api/v1/banners — authenticated. Mobile polls this; the role-aware
  // audience filter (clients vs professionals) is driven from the token.
  // For now the controller still uses ?audience=... query — when the
  // mobile app stops sending it, we'll have it derive from req.userId's
  // role server-side.
  //
  // requireAuth is attached PER-ROUTE (not via authed.use on a `/api/v1/`
  // mount) so it can never fire on an unrelated `/api/v1/*` path such as the
  // guest banners route or /auth/login.
  const authed = Router();
  authed.get(
    '/banners',
    requireAuth,
    validate(ListBannersPublicQuerySchema, 'query'),
    controller.publicList,
  );
  app.use('/api/v1/', authed);

  // Admin CRUD — banners are admin-only per spec (public-facing copy).
  const admin = Router();
  admin.use(requireAdmin, requireAdminRole(ADMIN_ONLY));
  admin.get('/', validate(ListBannersAdminQuerySchema, 'query'), controller.adminList);
  admin.get('/:id', controller.adminGet);
  admin.post(
    '/',
    validate(CreateBannerSchema),
    auditAdmin({
      action: 'banners.create',
      targetType: 'banner',
      targetIdFrom: () => null,
    }),
    controller.adminCreate,
  );
  admin.patch(
    '/:id',
    validate(UpdateBannerSchema),
    auditAdmin({ action: 'banners.update', targetType: 'banner' }),
    controller.adminUpdate,
  );
  admin.delete(
    '/:id',
    auditAdmin({ action: 'banners.delete', targetType: 'banner' }),
    controller.adminDelete,
  );
  admin.post(
    '/:id/launch',
    auditAdmin({ action: 'banners.launch', targetType: 'banner' }),
    controller.adminLaunch,
  );
  admin.post(
    '/:id/pause',
    auditAdmin({ action: 'banners.pause', targetType: 'banner' }),
    controller.adminPause,
  );
  app.use('/api/v1/admin/banners', admin);
};
