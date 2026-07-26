import { Router } from 'express';
import type { Express } from 'express';

import { validate } from '@lib/http/validateRequest.js';
import { auditAdmin } from '@middlewares/auditAdmin.middleware.js';
import { requireAdmin, requireAdminRole } from '@middlewares/requireAdmin.middleware.js';

import * as controller from './campaigns.controller.js';
import { CreateCampaignSchema } from './campaigns.schema.js';

const ADMIN_ONLY = ['admin'] as const;

// Admin-only: a campaign reaches every targeted user, so it is not a staff verb.
export const register = (app: Express): void => {
  const router = Router();
  router.use(requireAdmin, requireAdminRole(ADMIN_ONLY));

  router.get('/', controller.list);
  router.post('/', validate(CreateCampaignSchema), controller.create);
  router.post(
    '/:id/schedule',
    auditAdmin({ action: 'campaigns.schedule', targetType: 'campaign' }),
    controller.schedule,
  );
  router.post(
    '/:id/cancel',
    auditAdmin({ action: 'campaigns.cancel', targetType: 'campaign' }),
    controller.cancel,
  );

  app.use('/api/v1/admin/campaigns', router);
};
