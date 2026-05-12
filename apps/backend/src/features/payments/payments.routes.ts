import express, { Router } from 'express';
import type { Express } from 'express';

import { requireAuth } from '@middlewares/auth.middleware.js';
import { requireActiveUser } from '@middlewares/requireActiveUser.middleware.js';

import * as controller from './payments.controller.js';

export const register = (app: Express): void => {
  // Authed reader.
  const userRouter = Router();
  userRouter.use(requireAuth, requireActiveUser);
  userRouter.get('/:reference', controller.getByReference);
  app.use('/api/v1/payments', userRouter);

  // Webhook. Public route — gated by HMAC signature instead of auth.
  // CRITICAL: express.raw() must be mounted BEFORE this route so req.body
  // arrives as a Buffer. We mount it inline here, NOT globally — the rest of
  // the app uses express.json().
  const webhookRouter = Router();
  webhookRouter.post(
    '/paystack',
    express.raw({ type: 'application/json', limit: '1mb' }),
    controller.paystackWebhook,
  );
  app.use('/api/v1/webhooks', webhookRouter);
};
