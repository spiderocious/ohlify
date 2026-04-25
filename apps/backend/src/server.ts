import { createServer } from 'node:http';

import { pool } from '@lib/db/pool.js';
import { logger } from '@lib/logger.js';
import { redis } from '@lib/redis/client.js';

import { buildApp } from './app.js';
import { env } from './env.js';

const shutdown = async (signal: string): Promise<void> => {
  logger.info({ signal }, 'shutting down gracefully');
  server.close();
  await Promise.allSettled([pool.end(), redis.quit()]);
  process.exit(0);
};

const app = buildApp();
const server = createServer(app);

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'server listening');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
