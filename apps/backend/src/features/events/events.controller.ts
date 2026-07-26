import type { Request, Response, RequestHandler } from 'express';

import { logger } from '@lib/logger.js';
import { addConnection, RealtimeEvent } from '@lib/realtime/index.js';

/**
 * The SSE stream a signed-in client holds open.
 *
 * Auth is the standard `Authorization` header — never a query-string token,
 * which would land in every proxy and access log for the life of the
 * connection.
 *
 * The first thing written is a `sync`: a reconnecting client should invalidate
 * everything and refetch rather than have the server replay a backlog. That
 * makes correctness independent of how long the client was away, and is why
 * `Last-Event-ID` is deliberately unused.
 */
export const stream: RequestHandler = (req: Request, res: Response) => {
  const userId = req.userId!;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    // Tells nginx-style proxies not to buffer, which would hold events until
    // the response closed — i.e. forever.
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  // Node's own idle timeouts would sever a healthy long-lived stream.
  req.socket.setTimeout(0);
  req.socket.setNoDelay(true);
  req.socket.setKeepAlive(true);

  const remove = addConnection(userId, res);

  res.write(`event: ${RealtimeEvent.SYNC}\n`);
  res.write(`data: {}\n\n`);

  req.on('close', () => {
    remove();
    logger.debug({ userId }, 'sse connection closed');
  });
};
