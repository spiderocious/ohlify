import { createServer } from 'node:http';

import { initPlatformConfig } from '@lib/config/platform-config.service.js';
import { pool } from '@lib/db/pool.js';
import { logger } from '@lib/logger.js';
import { createEmailWorker } from '@lib/notifications/email-worker.js';
import { redis } from '@lib/redis/client.js';

import { buildApp } from './app.js';
import { env } from './env.js';
import { startOutboxWorker } from './workers/outbox.worker.js';

const emailWorker = createEmailWorker(env.REDIS_URL);
const outboxWorker = startOutboxWorker();

const shutdown = async (signal: string): Promise<void> => {
  logger.info({ signal }, 'shutting down gracefully');
  await Promise.allSettled([
    new Promise<void>((resolve) => server.close(() => resolve())),
    outboxWorker.stop(),
    pool.end(),
    redis.quit(),
    emailWorker.close(),
  ]);
  process.exit(0);
};

// Eager-load the platform_config snapshot before serving traffic so the first
// request doesn't see compiled-in defaults. Errors are non-fatal — the snapshot
// stays at defaults and the next refresh tick retries.
await initPlatformConfig();

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
