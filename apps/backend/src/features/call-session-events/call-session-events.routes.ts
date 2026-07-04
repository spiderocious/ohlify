import { Router, type Express } from 'express';

import { ipRateLimit } from '@lib/redis/rateLimit.js';
import { validate } from '@lib/http/validateRequest.js';

import * as controller from './call-session-events.controller.js';
import { IngestEventSchema, ListEventsQuerySchema } from './call-session-events.schema.js';

// ── Authentication note ───────────────────────────────────────────────────────
// Events are posted by the call-app iframe with no user JWT. Auth is via the
// X-Session-Token header (short-lived token minted at join). During the dev
// phase (no session token minting yet) the endpoint accepts unauthenticated
// writes — rate-limited by IP. When Phase 4 lands, add the session token
// middleware here before controller.ingest.

export const register = (app: Express): void => {
  const router = Router();

  // POST /api/v1/call-sessions/:call_id/events — ingest a single event.
  // Called by BackendProvider in the call-app. Fire-and-forget from client side.
  router.post(
    '/:call_id/events',
    ipRateLimit(300, 60), // 300 events/min per IP — generous for active calls
    validate(IngestEventSchema),
    controller.ingest,
  );

  // GET /api/v1/call-sessions/:call_id/events — retrieve event log for a call.
  router.get('/:call_id/events', validate(ListEventsQuerySchema, 'query'), controller.list);

  // GET /api/v1/call-sessions/:call_id/summary — derived call summary.
  // Includes authoritative connected_seconds, participants, end reason.
  router.get('/:call_id/summary', controller.summary);

  // GET /api/v1/call-sessions/by-reference/:reference — events by call_reference.
  // Useful when the parent passes a booking_id or order_id as call_reference.
  router.get('/by-reference/:reference', controller.listByReference);

  app.use('/api/v1/call-sessions', router);
};
