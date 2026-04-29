import { Router } from 'express';
import type { Express } from 'express';

import { validate } from '@lib/http/validateRequest.js';
import { auditAdmin } from '@middlewares/auditAdmin.middleware.js';
import { requireAdmin } from '@middlewares/requireAdmin.middleware.js';

import * as controller from './banners.controller.js';
import {
  CreateBannerSchema,
  ListBannersAdminQuerySchema,
  ListBannersPublicQuerySchema,
  UpdateBannerSchema,
} from './banners.schema.js';

export const register = (app: Express): void => {
  // Public list — no auth. Mobile app polls this for in-app banners.
  const pub = Router();
  pub.get('/banners', validate(ListBannersPublicQuerySchema, 'query'), controller.publicList);
  app.use('/api/v1', pub);

  // Admin CRUD.
  const admin = Router();
  admin.use(requireAdmin);
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
  app.use('/api/v1/admin/banners', admin);
};
