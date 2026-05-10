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
  // /api/v1/banners — authenticated. Mobile polls this; the role-aware
  // audience filter (clients vs professionals) is driven from the token.
  // For now the controller still uses ?audience=... query — when the
  // mobile app stops sending it, we'll have it derive from req.userId's
  // role server-side.
  const authed = Router();
  authed.use(requireAuth);
  authed.get('/banners', validate(ListBannersPublicQuerySchema, 'query'), controller.publicList);
  // Mount at /api/v1/banners (NOT /api/v1) — a router-level requireAuth on a
  // /api/v1 mount fires on every /api/v1/* request, including /auth/login.
  app.use('/api/v1/', authed);

  // /api/v1/public/banners — no-auth variant for guests / web-landing.
  // Same view shape, no userId required. Sensitive only-internal fields
  // are already stripped by toPublicView at the service layer.
  const pub = Router();
  pub.get('/', validate(ListBannersPublicQuerySchema, 'query'), controller.publicList);
  app.use('/api/v1/public/banners', pub);

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
