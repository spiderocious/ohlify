import type { Express } from 'express';

import { logger } from '@lib/logger.js';

import { env } from '../../env.js';

import devRoutes from './dev.routes.js';

// Dev-only routes (Agora token mint for the demo harness). Never registered
// in production. Caller decides whether to invoke this register function.
export const register = (app: Express): void => {
  if (env.NODE_ENV === 'production') {
    logger.info('dev routes skipped (production)');
    return;
  }
  app.use('/api/v1/dev', devRoutes);
  logger.info('dev routes registered at /api/v1/dev');
};
