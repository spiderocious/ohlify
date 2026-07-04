import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { register as registerAdmin } from '@features/admin/index.js';
import { register as registerAdminAuth } from '@features/admin-auth/index.js';
import { register as registerAuth } from '@features/auth/index.js';
import { register as registerBanks } from '@features/banks/index.js';
import { register as registerBanners } from '@features/banners/index.js';
import { register as registerBookings } from '@features/bookings/index.js';
import { register as registerAgoraWebhook } from '@features/calls/agora.webhook.routes.js';
import { register as registerCalls } from '@features/calls/index.js';
import { register as registerCategories } from '@features/categories/index.js';
import { register as registerCallSessionEvents } from '@features/call-session-events/index.js';
import { register as registerDev } from '@features/dev/index.js';
import { register as registerHealth } from '@features/health/index.js';
import { register as registerLegal } from '@features/legal/index.js';
import { register as registerOnboarding } from '@features/onboarding/index.js';
import { register as registerPayments } from '@features/payments/index.js';
import { register as registerPlatformConfig } from '@features/platform-config/index.js';
import { register as registerProfessionals } from '@features/professionals/index.js';
import { register as registerProfile } from '@features/profile/index.js';
import { register as registerRates } from '@features/rates/index.js';
import { register as registerRefunds } from '@features/refunds/index.js';
import { register as registerReviews } from '@features/reviews/index.js';
import { register as registerStrikes } from '@features/strikes/index.js';
import { register as registerSupport } from '@features/support/index.js';
import { register as registerWallet } from '@features/wallet/index.js';
import { ResponseUtil } from '@lib/response.js';
import { errorHandler } from '@middlewares/errorHandler.middleware.js';
import { globalRateLimit } from '@middlewares/rateLimit.middleware.js';
import { requestIdMiddleware } from '@middlewares/requestId.middleware.js';
import { requestLogMiddleware } from '@middlewares/requestLog.middleware.js';
import { ERROR_CODES, severityFor } from '@shared/constants/error-codes.js';
import { resolveErrorMessage } from '@shared/constants/error-messages.js';
import { HTTP_STATUS } from '@shared/constants/http-status.js';

// The Paystack + Agora webhook paths need the body as raw bytes for HMAC
// signature verification. We skip global json parsing on those routes by
// checking the URL before delegating to express.json(). The webhook routers
// mount their own express.raw() at the route level.
const PAYSTACK_WEBHOOK_PATH = '/api/v1/webhooks/paystack';
const AGORA_WEBHOOK_PATH = '/api/v1/webhooks/agora';

// ── Feature registration order matters ─────────────────────────────────────
//
// Express prefix-matches mounted routers in registration order. A router
// mounted at /A is tried before one at /A/B even when the incoming URL is
// /A/B — and any ROUTER-LEVEL middleware on the earlier mount runs first.
// Per-route middleware (e.g. `router.post('/x', requireAuth, handler)`) is
// fine because it only runs when the path inside the router matches; the
// problem is router-wide `meRouter.use(requireActiveUser)`.
//
// Three routers currently mount under /api/v1/me:
//   - auth     — per-route gating only (no router-level requireActiveUser).
//                Doesn't shadow anything; safe in any position.
//   - onboarding — router-level requireAuth + requireActiveUser.
//   - profile    — router-level requireAuth + requireActiveUser.
//
// The strikes router mounts at /api/v1/me/strikes WITHOUT requireActiveUser
// (suspended pros need to be able to dispute their strikes — that's the
// whole point of the dispute flow). If onboarding OR profile is registered
// first, Express enters their router and the requireActiveUser middleware
// rejects with 403 before the request ever reaches strikes — making
// dispute impossible. See QA findings C-NEW-07 (round 2 + round 3).
//
// Rule: ANY router under /api/v1/me with relaxed middleware MUST be
// registered BEFORE both onboarding and profile. Today: strikes (relaxed —
// suspended pros need to dispute) and reviews (just earlier-registered to
// avoid future shadowing if /me/reviews-given ever needs relaxed gating).
// If you add another (e.g. /api/v1/me/notifications-preferences for a
// partially-active user), it MUST also go before onboarding/profile.

const features = [
  registerHealth,
  registerAuth,
  registerPlatformConfig,
  registerStrikes, // /api/v1/me/strikes — must precede registerOnboarding + registerProfile
  registerReviews, // /api/v1/me/reviews-given — must precede registerOnboarding + registerProfile
  registerOnboarding,
  registerProfile,
  registerBanks,
  registerRates,
  registerCategories,
  registerProfessionals,
  registerLegal,
  registerSupport,
  registerWallet,
  registerPayments,
  registerRefunds,
  registerBookings,
  registerCalls,
  registerAgoraWebhook,
  registerCallSessionEvents, // /api/v1/call-sessions — event log, summary, by-reference
  registerAdminAuth, // /api/v1/admin/auth/* — login/refresh/logout (public) + totp/setup,confirm (authed)
  registerAdmin,
  registerDev, // dev-only; no-op in production. Demo Agora token mint at /api/v1/dev/agora-token.
  registerBanners,
];

export const buildApp = (): express.Express => {
  const app = express();

  app.set('trust proxy', 1);

  // Security
  app.use(helmet());
  // eslint-disable-next-line sonarjs/cors
  app.use(
    cors({
      origin: '*', //[env.WEB_BASE_URL],
      credentials: true,
    }),
  );

  // Request identity + logging (must be before body parsing)
  app.use(requestIdMiddleware);
  app.use(requestLogMiddleware);

  // Body parsing — skipped for the Paystack webhook so signature verification
  // can run against the original bytes. All other routes get JSON parsing.
  const jsonParser = express.json({ limit: '1mb' });
  app.use((req, res, next) => {
    if (req.path === PAYSTACK_WEBHOOK_PATH || req.path === AGORA_WEBHOOK_PATH) {
      next();
      return;
    }
    jsonParser(req, res, next);
  });
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(compression());

  // Global rate limit
  app.use(globalRateLimit);

  // Feature routes
  features.forEach((register) => register(app));

  // 404
  app.use((_req, res) => {
    ResponseUtil.error(res, HTTP_STATUS.NOT_FOUND, {
      errorCode: severityFor(ERROR_CODES.NOT_FOUND),
      errorMessage: resolveErrorMessage(ERROR_CODES.NOT_FOUND),
      reason: ERROR_CODES.NOT_FOUND,
    });
  });

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
};
