import { Router } from 'express';
import type { Express } from 'express';

import { validate } from '@lib/http/validateRequest.js';
import { ipRateLimit } from '@lib/redis/rateLimit.js';
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
  // Admin login is the highest-value credential surface in the product and had
  // NO throttle — a brute-force could run unbounded. IP rate-limit it (10 tries
  // / 15 min), matching the user auth surface. (BUGS.md B4.)
  pub.post('/login', ipRateLimit(10, 15 * 60), validate(AdminLoginSchema), controller.login);
  pub.post('/refresh', ipRateLimit(30, 15 * 60), validate(AdminRefreshSchema), controller.refresh);
  pub.post('/logout', validate(AdminLogoutSchema), controller.logout);
  // One-shot first-admin bootstrap. Gated by env flag + table-state check
  // inside the service — see admin-auth.service.ts → bootstrap().
  pub.post('/bootstrap', ipRateLimit(5, 15 * 60), controller.bootstrap);
  app.use('/api/v1/admin/auth', pub);

  const authed = Router();
  authed.use(requireAdmin);
  authed.post('/totp/setup', validate(AdminTotpSetupSchema), controller.totpSetup);
  authed.post('/totp/confirm', validate(AdminTotpConfirmSchema), controller.totpConfirm);
  app.use('/api/v1/admin/auth', authed);
};
