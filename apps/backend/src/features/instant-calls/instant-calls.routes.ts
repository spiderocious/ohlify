import { Router } from 'express';
import type { Express } from 'express';

import { validate } from '@lib/http/validateRequest.js';
import { rateLimitMiddleware } from '@lib/redis/rateLimit.js';
import { requireAuth } from '@middlewares/auth.middleware.js';
import { requireActiveUser } from '@middlewares/requireActiveUser.middleware.js';
import { requireFeatureEnabled } from '@middlewares/requireFeatureEnabled.middleware.js';

import * as controller from './instant-calls.controller.js';
import {
  EndCallSchema,
  InviteToCallSchema,
  RespondToInviteSchema,
  RespondToRingSchema,
  StartCallSchema,
  AnswerCallSchema,
} from './instant-calls.schema.js';

export const register = (app: Express): void => {
  const router = Router();
  router.use(requireAuth, requireActiveUser);

  // Caller starts an instant call (preflight: credit / availability / busy).
  // Only starting is gated — answer, pause, resume and end stay open so a call
  // already in progress can be finished and settled rather than abandoned
  // mid-conversation with money in escrow.
  router.post(
    '/',
    requireFeatureEnabled('calls'),
    rateLimitMiddleware((req) => `instant-call-start:${req.userId ?? 'anon'}`, 30, 3600),
    validate(StartCallSchema),
    controller.start,
  );

  // This user's instant calls, either side — including `rejected` attempts
  // that never rang. Registered before `/:id` routes so the literal path is
  // never captured as an id.
  router.get('/history', controller.history);

  // What the professional earned. Payee-only; the service enforces that.
  router.get('/:id/earnings', controller.earnings);

  // Callee answers a ringing call.
  router.post('/:id/answer', validate(AnswerCallSchema), controller.answer);

  // Metering suspends while the caller tops up, and resumes once the intent
  // verifies. Both write into the call-app event log that settlement reads.
  router.post('/:id/pause', controller.pause);
  router.post('/:id/resume', controller.resume);

  // Either party ends (or cancels/declines) the call.
  router.post('/:id/end', validate(EndCallSchema), controller.end);

  // Multi-party. The roster is readable by anyone in the call; every write is
  // authorized by role inside the service, not by the route.
  router.get('/:id/participants', controller.listParticipants);
  router.post(
    '/:id/invites',
    // Deliberately tighter than the ordinary write limit: looking someone up
    // by email makes this an account-existence oracle, and 10 attempts per
    // 30 minutes makes enumerating a list impractical while leaving genuine
    // use — inviting one or two people to a call — comfortably unaffected.
    rateLimitMiddleware((req) => `call-invite:${req.userId ?? 'anon'}`, 10, 1800),
    validate(InviteToCallSchema),
    controller.invite,
  );
  router.post(
    '/:id/invites/:participantId',
    validate(RespondToInviteSchema),
    controller.respondToInvite,
  );
  router.post('/:id/ring-response', validate(RespondToRingSchema), controller.respondToRing);

  app.use('/api/v1/instant-calls', router);
};
