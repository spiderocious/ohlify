import express, { Router } from 'express';
import type { Express } from 'express';

import { agoraWebhook } from './agora.webhook.controller.js';

export const register = (app: Express): void => {
  // Public route — gated by HMAC signature. express.raw mounted inline so
  // we get the bytes for HMAC verification, separate from the rest of the
  // app's JSON parsing.
  const router = Router();
  router.post('/agora', express.raw({ type: 'application/json', limit: '1mb' }), agoraWebhook);
  app.use('/api/v1/webhooks', router);
};
