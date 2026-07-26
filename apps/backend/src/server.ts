import { createServer, type Server } from 'node:http';

import express from 'express';

import { initPlatformConfig } from '@lib/config/platform-config.service.js';
import { pool } from '@lib/db/pool.js';
import { logger } from '@lib/logger.js';
import { createEmailWorker } from '@lib/notifications/email-worker.js';
import { initRealtime, stopRealtime } from '@lib/realtime/index.js';
import { redis } from '@lib/redis/client.js';
import { isEnabled } from '@shared/utils/env-flag.js';

import { buildApp } from './app.js';
import { env } from './env.js';
import { startCallWorkers } from './workers/calls.worker.js';
import { startCampaignWorker, type CampaignWorkerHandle } from './workers/campaigns.worker.js';
import {
  startWithdrawalReviewWorker,
  type WithdrawalReviewWorkerHandle,
} from './workers/withdrawal-review.worker.js';
import { startOutboxWorker } from './workers/outbox.worker.js';
import { startReconciliationWorker } from './workers/reconciliation.worker.js';

if (env.NODE_ENV === 'production' && !env.AGORA_WEBHOOK_SECRET) {
  throw new Error('AGORA_WEBHOOK_SECRET is required in production');
}

type WorkerHandles = {
  emailWorker: ReturnType<typeof createEmailWorker> | null;
  outboxWorker: ReturnType<typeof startOutboxWorker> | null;
  reconciliationWorker: ReturnType<typeof startReconciliationWorker> | null;
  callWorkers: ReturnType<typeof startCallWorkers> | null;
  campaignWorker: CampaignWorkerHandle | null;
  withdrawalReviewWorker: WithdrawalReviewWorkerHandle | null;
};

const startWorkers = (): WorkerHandles => {
  const emailEnabled = isEnabled(env.WORKER_EMAIL_ENABLED);
  const outboxEnabled = isEnabled(env.WORKER_OUTBOX_ENABLED);
  const reconciliationEnabled = isEnabled(env.WORKER_RECONCILIATION_ENABLED);
  const campaignEnabled = isEnabled(env.WORKER_CAMPAIGN_ENABLED);
  const withdrawalReviewEnabled = isEnabled(env.WORKER_WITHDRAWAL_REVIEW_ENABLED);

  if (!emailEnabled) logger.info({ worker: 'email' }, 'worker disabled via env');
  if (!outboxEnabled) logger.info({ worker: 'outbox' }, 'worker disabled via env');
  if (!reconciliationEnabled) logger.info({ worker: 'reconciliation' }, 'worker disabled via env');
  if (!campaignEnabled) logger.info({ worker: 'campaign' }, 'worker disabled via env');
  if (!withdrawalReviewEnabled)
    logger.info({ worker: 'withdrawal-review' }, 'worker disabled via env');

  return {
    emailWorker: emailEnabled ? createEmailWorker(env.REDIS_URL) : null,
    outboxWorker: outboxEnabled ? startOutboxWorker() : null,
    reconciliationWorker: reconciliationEnabled ? startReconciliationWorker() : null,
    callWorkers: startCallWorkers({
      starter: isEnabled(env.WORKER_CALL_STARTER_ENABLED),
      noShowResolver: isEnabled(env.WORKER_NO_SHOW_RESOLVER_ENABLED),
      stuckCallResolver: isEnabled(env.WORKER_STUCK_CALL_RESOLVER_ENABLED),
      ringResolver: isEnabled(env.WORKER_RING_RESOLVER_ENABLED),
      staleActiveResolver: isEnabled(env.WORKER_STALE_ACTIVE_RESOLVER_ENABLED),
      intentExpiry: isEnabled(env.WORKER_INTENT_EXPIRY_ENABLED),
      inviteExpiry: isEnabled(env.WORKER_INVITE_EXPIRY_ENABLED),
    }),
    campaignWorker: campaignEnabled ? startCampaignWorker() : null,
    withdrawalReviewWorker: withdrawalReviewEnabled ? startWithdrawalReviewWorker() : null,
  };
};

const PORT = ['all', 'app'].includes(env.PROCESS_ROLE) ? env.PORT : env.WORKER_PORT;

const startHttpApp = (): Server => {
  const app = buildApp();
  const server = createServer(app);

  // SSE connections are held open indefinitely. Node's defaults would sever a
  // perfectly healthy stream — headersTimeout after 60s, requestTimeout after
  // 5 minutes — and the client would reconnect in a loop. Disabled globally
  // because these are read-timeouts on idle sockets, and the platform's own
  // proxy still bounds anything genuinely stuck. The 20s SSE heartbeat is what
  // actually keeps intermediaries from closing the connection.
  server.headersTimeout = 0;
  server.requestTimeout = 0;
  server.keepAliveTimeout = 65_000;

  // Redis fanout for the SSE stream. HTTP roles only — workers publish through
  // their own client and hold no connections of their own.
  initRealtime();

  server.listen(PORT, () => {
    logger.info({ port: PORT, env: env.NODE_ENV, role: env.PROCESS_ROLE }, 'server listening');
  });
  return server;
};

// In 'worker' mode we still bind a minimal HTTP listener so Railway's TCP/HTTP
// healthchecks succeed. It exposes only /health — no app routes, no middleware.
const startHealthOnlyServer = (): Server => {
  const app = express();
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', role: env.PROCESS_ROLE });
  });
  const server = createServer(app);
  server.listen(PORT, () => {
    logger.info({ port: PORT, role: env.PROCESS_ROLE }, 'health-only server listening');
  });
  return server;
};

const role = env.PROCESS_ROLE;
logger.info({ role }, 'starting process');

// Platform config snapshot is needed by both the HTTP layer and workers, so
// initialize it for every role before doing anything else. Errors are
// non-fatal — the snapshot stays at defaults and the next refresh tick retries.
await initPlatformConfig();

const workers: WorkerHandles | null = role !== 'app' ? startWorkers() : null;
const server: Server = role === 'worker' ? startHealthOnlyServer() : startHttpApp();

const shutdown = async (signal: string): Promise<void> => {
  logger.info({ signal, role }, 'shutting down gracefully');
  await Promise.allSettled([
    new Promise<void>((resolve) => server.close(() => resolve())),
    workers?.outboxWorker?.stop() ?? Promise.resolve(),
    workers?.reconciliationWorker?.stop() ?? Promise.resolve(),
    workers?.callWorkers?.stop() ?? Promise.resolve(),
    pool.end(),
    redis.quit(),
    stopRealtime(),
    workers?.emailWorker?.close() ?? Promise.resolve(),
    workers?.campaignWorker?.close() ?? Promise.resolve(),
    workers?.withdrawalReviewWorker?.close() ?? Promise.resolve(),
  ]);
  process.exit(0);
};

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
