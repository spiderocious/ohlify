import { Router } from 'express';
import type { Express } from 'express';

import { validate } from '@lib/http/validateRequest.js';
import { rateLimitMiddleware } from '@lib/redis/rateLimit.js';
import { requireAuth } from '@middlewares/auth.middleware.js';
import { requireActiveUser } from '@middlewares/requireActiveUser.middleware.js';

import * as controller from './chat.controller.js';
import {
  OpenConversationSchema,
  ProposeScheduleSchema,
  RescheduleSchema,
  ScheduleActionSchema,
  SendMessageSchema,
} from './chat.schema.js';

export const register = (app: Express): void => {
  const router = Router();
  router.use(requireAuth, requireActiveUser);

  router.get('/conversations', controller.listConversations);
  router.post('/conversations', validate(OpenConversationSchema), controller.open);
  router.get('/unread-count', controller.unreadCount);

  router.get('/conversations/:id/context', controller.context);
  router.get('/conversations/:id/messages', controller.listMessages);
  router.post(
    '/conversations/:id/messages',
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

  app.use('/api/v1/chat', router);
};
