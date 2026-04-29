import { Router } from 'express';
import type { Express } from 'express';

import { validate } from '@lib/http/validateRequest.js';
import { requireAuth } from '@middlewares/auth.middleware.js';
import { requireAdmin } from '@middlewares/requireAdmin.middleware.js';

import * as controller from './strikes.controller.js';
import {
  AdminListStrikesQuerySchema,
  AdminUpholdStrikeSchema,
  AdminVoidStrikeSchema,
  DisputeStrikeSchema,
  ListStrikesQuerySchema,
} from './strikes.schema.js';

export const register = (app: Express): void => {
  // User-facing — pro lists their own strikes + disputes them. NOTE: we
  // intentionally don't gate on requireActiveUser because suspended pros
  // need to view + dispute their strikes to (potentially) get reinstated.
  const me = Router();
  me.use(requireAuth);
  me.get('/', validate(ListStrikesQuerySchema, 'query'), controller.listMine);
  me.get('/:id', controller.getMine);
  me.post('/:id/dispute', validate(DisputeStrikeSchema), controller.dispute);
  app.use('/api/v1/me/strikes', me);

  // Admin — list / uphold / void.
  const admin = Router();
  admin.use(requireAdmin);
  admin.get('/', validate(AdminListStrikesQuerySchema, 'query'), controller.adminList);
  admin.post('/:id/uphold', validate(AdminUpholdStrikeSchema), controller.adminUphold);
  admin.post('/:id/void', validate(AdminVoidStrikeSchema), controller.adminVoid);
  app.use('/api/v1/admin/strikes', admin);
};
