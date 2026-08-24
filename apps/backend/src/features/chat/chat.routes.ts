import { Router } from 'express';
import type { Express } from 'express';

import { validate } from '@lib/http/validateRequest.js';
import { rateLimitMiddleware } from '@lib/redis/rateLimit.js';
import { requireAuth } from '@middlewares/auth.middleware.js';
import { requireActiveUser } from '@middlewares/requireActiveUser.middleware.js';
import { requireFeatureEnabled } from '@middlewares/requireFeatureEnabled.middleware.js';

import * as controller from './chat.controller.js';
import {
  OpenConversationSchema,
  ProposeScheduleSchema,
  RescheduleSchema,
  ScheduleActionSchema,
  SendMessageSchema,
  InviteParticipantSchema,
  RespondToChatInviteSchema,
} from './chat.schema.js';

export const register = (app: Express): void => {
  const router = Router();
  router.use(requireAuth, requireActiveUser);

  // Reads stay open while chat is switched off — existing threads remain
  // readable, only new traffic stops.
  router.get('/conversations', controller.listConversations);
  router.post(
    '/conversations',
    requireFeatureEnabled('chat'),
    validate(OpenConversationSchema),
    controller.open,
  );
  router.get('/unread-count', controller.unreadCount);

  router.get('/conversations/:id/context', controller.context);
  router.get('/conversations/:id/messages', controller.listMessages);
  router.post(
    '/conversations/:id/messages',
    requireFeatureEnabled('chat'),
    rateLimitMiddleware((req) => `chat-send:${req.userId ?? 'anon'}`, 120, 60),
    validate(SendMessageSchema),
    controller.send,
  );
  router.post('/conversations/:id/read', controller.markRead);

  // Schedule-from-chat (chat-native marker; not the old bookings flow).
  router.post(
    '/conversations/:id/schedule',
    rateLimitMiddleware((req) => `chat-schedule:${req.userId ?? 'anon'}`, 30, 3600),
    validate(ProposeScheduleSchema),
    controller.proposeSchedule,
  );
  router.post(
    '/schedules/:messageId/action',
    validate(ScheduleActionSchema),
    controller.scheduleAction,
  );
  router.post(
    '/schedules/:messageId/reschedule',
    validate(RescheduleSchema),
    controller.reschedule,
  );

  // ── Group chat participants ───────────────────────────────────────────────
  // Only the owner may invite; only the professional may approve. Both rules
  // live in the service, not the route, so they hold for every caller.
  router.get('/conversations/:id/participants', controller.listParticipants);
  router.post(
    '/conversations/:id/participants',
    // Deliberately tighter than the ordinary write limit: looking someone up
    // by email makes this an account-existence oracle, and 10 attempts per
    // 30 minutes makes enumerating a list impractical while leaving genuine
    // use — inviting one or two people to a call — comfortably unaffected.
    rateLimitMiddleware((req) => `chat-invite:${req.userId ?? 'anon'}`, 10, 1800),
    validate(InviteParticipantSchema),
    controller.inviteParticipant,
  );
  router.post(
    '/conversations/:id/participants/:participantId/respond',
    validate(RespondToChatInviteSchema),
    controller.respondToInvite,
  );
  router.delete('/conversations/:id/participants/:participantId', controller.removeParticipant);

  app.use('/api/v1/chat', router);
};
