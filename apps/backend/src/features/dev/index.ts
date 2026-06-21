import type { Express } from 'express';

import { logger } from '@lib/logger.js';

import { env } from '../../env.js';

import callSessionsRoutes from './call-sessions.routes.js';
import devRoutes from './dev.routes.js';

// Dev-only routes. Never registered in production.
export const register = (app: Express): void => {
  if (env.NODE_ENV === 'production') {
    logger.info('dev routes skipped (production)');
    return;
  }
  app.use('/api/v1/dev', devRoutes);
  app.use('/api/v1/dev/call-sessions', callSessionsRoutes);
  logger.info('dev routes registered at /api/v1/dev');
};
