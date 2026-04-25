import { createServer } from 'node:http';

import { pool } from '@lib/db/pool.js';
import { logger } from '@lib/logger.js';
import { shutdownOtel } from '@lib/otel/init.js';
import { redis } from '@lib/redis/client.js';

import { buildApp } from './app.js';
import { env } from './env.js';


const start = async (): Promise<void> => {

  const app = buildApp();
  const server = createServer(app);

  server.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'server listening');
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'shutting down gracefully');
    server.close();
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
  // Can't use logger here — it depends on env which may not have loaded
  // eslint-disable-next-line no-console
  console.error('Fatal startup error', err);
  process.exit(1);
});
