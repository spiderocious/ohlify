import { Router } from 'express';
import type { Express } from 'express';

import { validate } from '@lib/http/validateRequest.js';
import { auditAdmin } from '@middlewares/auditAdmin.middleware.js';
import { requireAuth } from '@middlewares/auth.middleware.js';
import { requireAdmin, requireAdminRole } from '@middlewares/requireAdmin.middleware.js';

const STAFF = ['admin', 'support'] as const;

import * as controller from './strikes.controller.js';
import {
  AdminIssueStrikeSchema,
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

  // Admin — list / uphold / void. STAFF (admin or support) can moderate
  // strikes; this is moderation work, not money-moving.
  const admin = Router();
  admin.use(requireAdmin, requireAdminRole(STAFF));
  admin.get('/', validate(AdminListStrikesQuerySchema, 'query'), controller.adminList);
  // POST /admin/strikes — manual issuance. Audit's targetIdFrom can't read
  // params.id (it's a create), so we read subject_user_id from the body so
  // the audit row at least references the user this strike is against.
  admin.post(
    '/',
    validate(AdminIssueStrikeSchema),
    auditAdmin({
      action: 'strikes.issue',
      targetType: 'user',
      targetIdFrom: (req) => {
        const b = req.body as { subject_user_id?: unknown };
        return typeof b.subject_user_id === 'string' ? b.subject_user_id : null;
      },
    }),
    controller.adminIssue,
  );
  admin.get('/:id', controller.adminGet);
  admin.post(
    '/:id/uphold',
    validate(AdminUpholdStrikeSchema),
    auditAdmin({ action: 'strikes.uphold', targetType: 'strike' }),
    controller.adminUphold,
  );
  admin.post(
    '/:id/void',
    validate(AdminVoidStrikeSchema),
    auditAdmin({ action: 'strikes.void', targetType: 'strike' }),
    controller.adminVoid,
  );
  app.use('/api/v1/admin/strikes', admin);
};
