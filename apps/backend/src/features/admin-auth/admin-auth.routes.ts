import { Router } from 'express';
import type { Express } from 'express';

import { validate } from '@lib/http/validateRequest.js';
import { requireAdmin } from '@middlewares/requireAdmin.middleware.js';

import * as controller from './admin-auth.controller.js';
import {
  AdminLoginSchema,
  AdminLogoutSchema,
  AdminRefreshSchema,
  AdminTotpConfirmSchema,
  AdminTotpSetupSchema,
} from './admin-auth.schema.js';

// Admin auth surface. Login / refresh / logout are public; TOTP setup +
// confirm require an authenticated admin (so a freshly-provisioned admin
// signs in with password + (optionally) gets the TOTP enrollment QR code).
//
// Once an admin's totp_enabled flips true, login starts requiring totp_code.
export const register = (app: Express): void => {
  const pub = Router();
  pub.post('/login', validate(AdminLoginSchema), controller.login);
  pub.post('/refresh', validate(AdminRefreshSchema), controller.refresh);
  pub.post('/logout', validate(AdminLogoutSchema), controller.logout);
  app.use('/api/v1/admin/auth', pub);

  const authed = Router();
  authed.use(requireAdmin);
  authed.post('/totp/setup', validate(AdminTotpSetupSchema), controller.totpSetup);
  authed.post('/totp/confirm', validate(AdminTotpConfirmSchema), controller.totpConfirm);
  app.use('/api/v1/admin/auth', authed);
};
