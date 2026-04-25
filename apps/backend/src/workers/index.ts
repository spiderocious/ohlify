import { pool } from '@lib/db/pool.js';
import { logger } from '@lib/logger.js';
import { initOtel, shutdownOtel } from '@lib/otel/init.js';
import { redis } from '@lib/redis/client.js';

import { env } from '../env.js';

// BullMQ workers are registered here. Each worker processor lives alongside
// its feature (e.g. src/features/auth/auth.jobs.ts) and is imported below
// as features are implemented.

const start = async (): Promise<void> => {
  await initOtel();

  logger.info({ env: env.NODE_ENV }, 'worker process starting');

  // TODO: import and register workers as features are implemented
  // e.g. await import('@features/auth/auth.jobs.js');

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'worker shutting down');
    await Promise.allSettled([pool.end(), redis.quit(), shutdownOtel()]);
    process.exit(0);
  };

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
};

start().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Fatal worker startup error', err);
  process.exit(1);
});
