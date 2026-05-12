import pino, { type Logger, type LoggerOptions } from 'pino';

import { requestContext } from '@lib/http/requestContext.js';

import { env } from '../env.js';

// Dev: single-line pretty output. We strip the structured fields from the
// formatted line because the message itself already carries everything human-
// readable; the fields are still in the underlying record for anyone piping
// logs through jq.
//
// Prod: stock pino JSON. Fields are essential for log-drain queries (when one
// is wired up).
const transport: LoggerOptions['transport'] =
  env.NODE_ENV !== 'production'
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          singleLine: true,
          translateTime: 'HH:MM:ss.l',
          ignore:
            'pid,hostname,service,env,adminId,adminRole,method,path,statusCode,durationMs,ip,userAgent,route',
        },
      }
    : undefined;

const baseLogger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'ohlify-backend', env: env.NODE_ENV, procRole: env.PROCESS_ROLE },
  ...(transport !== undefined ? { transport } : {}),
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'body.password',
      'body.token',
      'body.otp',
      '*.password',
      '*.password_hash',
      '*.token',
      '*.refresh_token',
      '*.secret',
      '*.accessToken',
      '*.refreshToken',
    ],
    remove: true,
  },
});

// Pulls request-scoped fields out of AsyncLocalStorage on every log call so
// services and repos don't need to thread context manually. Outside of a
// request (workers, cron, boot) there's no context — these fields are simply
// absent.
const ctxFields = (): Record<string, unknown> => {
  const ctx = requestContext.get();
  if (!ctx) return {};
  const out: Record<string, unknown> = { requestId: ctx.requestId };
  if (ctx.userId) out['userId'] = ctx.userId;
  if (ctx.role) out['role'] = ctx.role;
  if (ctx.adminId) out['adminId'] = ctx.adminId;
  if (ctx.adminRole) out['adminRole'] = ctx.adminRole;
  return out;
};

// Wrap the four log methods so every call auto-merges requestContext fields.
// We don't override `child()` etc.; if a caller wants a child logger they get
// the bare pino instance via `baseLogger`.
type LogMethod = (obj: object | string, msg?: string) => void;

const wrap = (level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'): LogMethod => {
  return (obj: object | string, msg?: string): void => {
    const ctx = ctxFields();
    if (typeof obj === 'string') {
      baseLogger[level]({ ...ctx }, obj);
    } else {
      baseLogger[level]({ ...ctx, ...obj }, msg);
    }
  };
};

export const logger = {
  trace: wrap('trace'),
  debug: wrap('debug'),
  info: wrap('info'),
  warn: wrap('warn'),
  error: wrap('error'),
  fatal: wrap('fatal'),
} satisfies Pick<Logger, 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'>;
