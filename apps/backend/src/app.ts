import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { register as registerAuth } from '@features/auth/index.js';
import { register as registerHealth } from '@features/health/index.js';
import { errorHandler } from '@middlewares/errorHandler.middleware.js';
import { globalRateLimit } from '@middlewares/rateLimit.middleware.js';
import { requestIdMiddleware } from '@middlewares/requestId.middleware.js';
import { requestLogMiddleware } from '@middlewares/requestLog.middleware.js';

import { env } from './env.js';

const features = [registerHealth, registerAuth];

export const buildApp = (): express.Express => {
  const app = express();

  app.set('trust proxy', 1);

  // Security
  app.use(helmet());
  app.use(
    cors({
      origin: [env.WEB_BASE_URL],
      credentials: true,
    }),
  );

  // Request identity + logging (must be before body parsing)
  app.use(requestIdMiddleware);
  app.use(requestLogMiddleware);

  // Body parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(compression());

  // Global rate limit
  app.use(globalRateLimit);

  // Feature routes
  features.forEach((register) => register(app));

  // 404
  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'not_found', message: 'Route not found' } });
  });

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
};
