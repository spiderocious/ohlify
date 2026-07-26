import { Router } from 'express';
import type { Express } from 'express';

import { validate } from '@lib/http/validateRequest.js';
import { ipRateLimit } from '@lib/redis/rateLimit.js';
import { auditAdmin } from '@middlewares/auditAdmin.middleware.js';
import { requireAdmin, requireAdminRole } from '@middlewares/requireAdmin.middleware.js';

import * as controller from './app-versions.controller.js';
import { CheckVersionQuerySchema, UpsertAppVersionSchema } from './app-versions.schema.js';

const ADMIN_ONLY = ['admin'] as const;

export const register = (app: Express): void => {
  // Unauthenticated, and deliberately NOT behind any enablement kill switch.
  // This is the only channel that can tell a client it must upgrade, so gating
  // it would leave a bad release with no route out. Per-IP limited only —
  // there is no userId at cold start.
  const pub = Router();
  pub.get('/', ipRateLimit(60, 60), validate(CheckVersionQuerySchema, 'query'), controller.check);
  app.use('/api/v1/app-version', pub);

  const admin = Router();
  admin.use(requireAdmin, requireAdminRole(ADMIN_ONLY));
  admin.get('/', controller.list);
  admin.put(
    '/',
    validate(UpsertAppVersionSchema),
    auditAdmin({
      action: 'app_versions.save',
      targetType: 'app_version',
      targetIdFrom: (req) => (req.body as { platform?: string }).platform ?? null,
    }),
    controller.save,
  );
  app.use('/api/v1/admin/app-versions', admin);
};
