import type { Response } from 'express';

import { logger } from '@lib/logger.js';

import type { RealtimeMessage } from './events.js';

/**
 * The SSE connections this process is holding, keyed by user.
 *
 * One user can have several (phone, tablet, a stale tab), so the value is a
 * set. Routing happens here in memory; Redis only decides which PROCESS hears
 * about an event, never which socket.
 */
const connections = new Map<string, Set<Response>>();

/** Proxies close idle connections, so a comment goes out well inside any sane timeout. */
const HEARTBEAT_INTERVAL_MS = 20_000;

const writeMessage = (res: Response, message: RealtimeMessage): void => {
  try {
    res.write(`event: ${message.type}\n`);
    res.write(`data: ${JSON.stringify(message.data ?? {})}\n\n`);
  } catch (err) {
    logger.warn({ err }, 'sse write failed; dropping connection');
    res.end();
  }
};

/**
 * Registers a live SSE response and returns its teardown.
 *
 * The heartbeat is a bare comment: it keeps the socket warm without the client
 * having to understand it. Without one, Railway's proxy closes the connection
 * roughly every minute and the client reconnects in a loop.
 */
export const addConnection = (userId: string, res: Response): (() => void) => {
  const existing = connections.get(userId) ?? new Set<Response>();
  existing.add(res);
  connections.set(userId, existing);

  const heartbeat = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      // The close handler below does the cleanup.
    }
  }, HEARTBEAT_INTERVAL_MS);
  heartbeat.unref();

  return () => {
    clearInterval(heartbeat);
    const set = connections.get(userId);
    if (!set) return;
    set.delete(res);
    // Drop the key entirely — a Map of empty Sets is a slow leak on a
    // long-lived process.
    if (set.size === 0) connections.delete(userId);
  };
};

/** Delivers to this process's sockets for a user. Called by the Redis subscriber. */
export const deliverLocal = (userId: string, message: RealtimeMessage): number => {
  const set = connections.get(userId);
  if (!set || set.size === 0) return 0;
  for (const res of set) writeMessage(res, message);
  return set.size;
};

/** Diagnostics: how many sockets this process is holding. */
export const connectionStats = (): { users: number; sockets: number } => {
  let sockets = 0;
  for (const set of connections.values()) sockets += set.size;
  return { users: connections.size, sockets };
};
