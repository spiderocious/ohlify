import type { NextFunction, Request, Response } from 'express';

import { requestContext } from '@lib/http/requestContext.js';
import { logger } from '@lib/logger.js';

import { env } from '../env.js';

// Single line per request, emitted on response 'finish'. Format:
//   <METHOD> <path> <status> <durationMs>ms
// Structured fields (requestId, userId, ip, userAgent, route) are attached
// for the JSON sink; pino-pretty's `ignore` strips them from the terminal
// view so the line stays scannable.
//
// Auth middlewares populate requestContext.userId / adminId before the route
// handler runs, so by the time 'finish' fires those slots are filled.

/**
 * Bodies are logged in **development only**.
 *
 * Not a log level: `LOG_LEVEL=debug` in production would start printing
 * request bodies for every user of the platform, and the one place that hurts
 * most is auth — the exact endpoints someone reaches for when debugging.
 * Tying it to `NODE_ENV === 'development'` means it cannot be switched on in
 * production by changing a log level.
 */
const LOG_BODIES = env.NODE_ENV === 'development';

/**
 * Keys whose values never reach the log, at any depth.
 *
 * pino's own `redact` config in `lib/logger.ts` covers fixed paths like
 * `body.password`. This is the recursive counterpart: request bodies are
 * arbitrarily shaped (`{ user: { password } }`, arrays of items), and a
 * fixed-path list cannot see into them.
 */
const SENSITIVE = new Set([
  'password',
  'newpassword',
  'currentpassword',
  'confirmpassword',
  'token',
  'accesstoken',
  'refreshtoken',
  'refresh_token',
  'access_token',
  'otp',
  'pin',
  'secret',
  'authorization',
  'bvn',
  'nin',
  'accountnumber',
  'account_number',
  'cvv',
  'card',
  'pan',
]);

const MAX_DEPTH = 6;
const MAX_STRING = 512;

/** Recursively replaces sensitive values and truncates long strings. */
const scrub = (value: unknown, depth = 0): unknown => {
  if (depth > MAX_DEPTH) return '[depth-limit]';
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…[truncated]` : value;
  }
  if (typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    // Long collections are noise; the shape is what matters when debugging.
    const head = value.slice(0, 20).map((v) => scrub(v, depth + 1));
    return value.length > 20 ? [...head, `…${value.length - 20} more`] : head;
  }

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SENSITIVE.has(k.toLowerCase()) ? '***' : scrub(v, depth + 1);
  }
  return out;
};

const isEmpty = (v: unknown): boolean =>
  v === undefined || v === null || (typeof v === 'object' && Object.keys(v).length === 0);

export const requestLogMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  let responseBody: unknown;

  if (LOG_BODIES) {
    // `res.json` is what every response in this app goes through (see
    // ResponseUtil), so wrapping it captures the payload without touching the
    // socket or buffering raw chunks.
    const originalJson = res.json.bind(res);
    res.json = (body: unknown): Response => {
      responseBody = body;
      return originalJson(body);
    };
  }

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
    const fields: Record<string, unknown> = {
      method: req.method,
      path: req.originalUrl,
      route,
      statusCode: status,
      durationMs,
      ip: req.ip,
      userAgent: req.header('user-agent'),
    };

    if (LOG_BODIES) {
      // Scrubbed and only when present, so a GET stays a one-liner.
      if (!isEmpty(req.body)) fields['reqBody'] = scrub(req.body);
      if (!isEmpty(req.query)) fields['reqQuery'] = scrub(req.query);
      if (!isEmpty(responseBody)) fields['resBody'] = scrub(responseBody);
    }

    logger[level](fields, message);
  });
  next();
};
