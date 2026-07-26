import { Redis } from 'ioredis';

import { env } from '../../env.js';
import { logger } from '@lib/logger.js';

import type { RealtimeMessage } from './events.js';
import { deliverLocal } from './registry.js';

/**
 * Redis pub/sub fanout for SSE.
 *
 * Exactly ONE subscriber connection per process, pattern-subscribed to every
 * user channel. The obvious alternative — a Redis connection per connected
 * user — exhausts the connection limit at a few hundred users and buys nothing,
 * since routing to individual sockets happens in memory anyway.
 *
 * Redis rather than a plain EventEmitter because the moment a second instance
 * exists, an in-process emitter silently delivers to half the users. Getting
 * this right costs nothing today.
 */
const CHANNEL_PREFIX = 'rt:user:';
const CHANNEL_PATTERN = `${CHANNEL_PREFIX}*`;

const channelFor = (userId: string): string => `${CHANNEL_PREFIX}${userId}`;

let subscriber: Redis | null = null;
let publisher: Redis | null = null;

/**
 * Opens the subscriber and starts routing.
 *
 * Separate connections because a Redis client in subscriber mode refuses
 * ordinary commands — publishing down the same socket would fail at runtime.
 */
export const initRealtime = (): void => {
  if (subscriber) return;

  subscriber = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: false });
  publisher = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 3, lazyConnect: false });

  subscriber.on('error', (err: unknown) => logger.error({ err }, 'realtime subscriber error'));
  publisher.on('error', (err: unknown) => logger.error({ err }, 'realtime publisher error'));

  subscriber.psubscribe(CHANNEL_PATTERN).catch((err: unknown) => {
    logger.error({ err }, 'realtime psubscribe failed');
  });

  subscriber.on('pmessage', (_pattern: string, channel: string, raw: string) => {
    const userId = channel.slice(CHANNEL_PREFIX.length);
    if (!userId) return;
    try {
      deliverLocal(userId, JSON.parse(raw) as RealtimeMessage);
    } catch (err) {
      logger.warn({ err, channel }, 'realtime message parse failed');
    }
  });

  logger.info({ pattern: CHANNEL_PATTERN }, 'realtime fanout started');
};

/**
 * Signals one user across every process.
 *
 * Fire-and-forget by design: a hint that fails to publish costs a delayed
 * refresh, and making callers await it would put Redis on the critical path of
 * every write that happens to be interesting.
 */
export const publish = (userId: string, message: RealtimeMessage): void => {
  if (!publisher) {
    // Worker-only processes never init realtime; delivering locally still
    // covers the single-process dev case.
    deliverLocal(userId, message);
    return;
  }
  publisher.publish(channelFor(userId), JSON.stringify(message)).catch((err: unknown) => {
    logger.warn({ err, userId, type: message.type }, 'realtime publish failed');
  });
};

export const stopRealtime = async (): Promise<void> => {
  await Promise.all([subscriber?.quit(), publisher?.quit()]);
  subscriber = null;
  publisher = null;
};
