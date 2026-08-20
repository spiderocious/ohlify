import { createBullBoard } from '@bull-board/api';
// No `.js` suffix — @bull-board/api's export map declares `./bullMQAdapter`
// exactly, and the extension the rest of this codebase uses for relative ESM
// imports does not apply to a package subpath export.
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Queue } from 'bullmq';
import type { Express } from 'express';

import { CAMPAIGN_QUEUE_NAME } from '@features/campaigns/campaigns.queue.js';
import { WITHDRAWAL_REVIEW_QUEUE_NAME } from '@features/wallet/withdrawal-review.queue.js';
import { logger } from '@lib/logger.js';

import { env } from '../../env.js';

export const QUEUE_DASHBOARD_PATH = '/admin/queues';

/**
 * Bull Board — waiting/active/failed/completed counts, job payloads, stack
 * traces, and retry for every BullMQ queue.
 *
 * **Never mounted in production.** The page is server-rendered, so a browser
 * reaches it by plain navigation and sends no `Authorization` header — which
 * is the only thing `requireAdmin` understands. Gating it properly would mean
 * building a cookie session and a login page purely for this dashboard, and
 * that is a real auth surface guarding job payloads that contain user email
 * addresses, plus retry and delete buttons.
 *
 * For a production incident: port-forward Redis and run this locally against
 * it. Same UI, no exposed endpoint.
 *
 * ## Not everything is here
 *
 * `outbox.worker.ts` is **not** BullMQ — it is a hand-rolled `loop()` polling
 * Postgres, so it does not appear on this dashboard at all. That is the worker
 * that silently fell back to a no-op push provider for a whole cycle. Do not
 * read "all queues healthy" as "all background work healthy".
 */
export const registerQueueDashboard = (app: Express): void => {
  if (env.NODE_ENV === 'production') return;

  // Read-only handles. Deliberately constructed here rather than importing the
  // live producer instances:
  //
  //  - the `email` queue is module-private in notification.service.ts, and
  //    exporting it just to satisfy a dev tool would widen a production API
  //    for a debugging convenience;
  //  - a `Queue` pointed at the same name and Redis sees exactly the same
  //    jobs, because the queue lives in Redis, not in the object.
  const connection = { url: env.REDIS_URL };
  const queues = [CAMPAIGN_QUEUE_NAME, WITHDRAWAL_REVIEW_QUEUE_NAME, 'email'].map(
    (name) => new Queue(name, { connection }),
  );

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath(QUEUE_DASHBOARD_PATH);

  createBullBoard({
    queues: queues.map((q) => new BullMQAdapter(q)),
    serverAdapter,
  });

  app.use(QUEUE_DASHBOARD_PATH, serverAdapter.getRouter());

  logger.info(
    { path: QUEUE_DASHBOARD_PATH, queues: queues.map((q) => q.name) },
    'queue dashboard mounted (non-production only)',
  );
};
