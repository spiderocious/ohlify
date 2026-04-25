import { Queue } from 'bullmq';

import { env } from '../../env.js';

const connection = { url: env.REDIS_URL };

export const emailQueue = new Queue('email', { connection });
export const pushQueue = new Queue('push', { connection });
export const outboxQueue = new Queue('outbox', { connection });
export const cronQueue = new Queue('cron', { connection });
