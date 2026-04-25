import pino, { type LoggerOptions } from 'pino';

import { env } from '../env.js';

const transport: LoggerOptions['transport'] =
  env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined;

export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'ohlify-backend', env: env.NODE_ENV },
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
