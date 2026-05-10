import type { NextFunction, Request, Response } from 'express';

import { requestContext } from '@lib/http/requestContext.js';
import { logger } from '@lib/logger.js';

// Single line per request, emitted on response 'finish'. Format:
//   <METHOD> <path> <status> <durationMs>ms
// Structured fields (requestId, userId, ip, userAgent, route) are attached
// for the JSON sink; pino-pretty's `ignore` strips them from the terminal
// view so the line stays scannable.
//
// Auth middlewares populate requestContext.userId / adminId before the route
// handler runs, so by the time 'finish' fires those slots are filled.
export const requestLogMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  res.on('finish', () => {
    const ctx = requestContext.get();
    const startedAt = ctx?.startedAt ?? Date.now();
    const durationMs = Date.now() - startedAt;
    const status = res.statusCode;

    let level: 'info' | 'warn' | 'error' = 'info';
    if (status >= 500) level = 'error';
    else if (status >= 400) level = 'warn';

    const message = `${req.method} ${req.originalUrl} ${status} ${durationMs}ms`;
    const route = (req.route as { path?: string } | undefined)?.path;

    // Structured fields ride on the log record — invisible in dev terminal,
    // queryable in prod JSON.
    logger[level](
      {
        method: req.method,
        path: req.originalUrl,
        route,
        statusCode: status,
        durationMs,
        ip: req.ip,
        userAgent: req.header('user-agent'),
      },
      message,
    );
  });
  next();
};
