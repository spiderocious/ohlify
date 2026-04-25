import pino, { type LoggerOptions } from 'pino';

const transport: LoggerOptions['transport'] =
  process.env['NODE_ENV'] !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined;

export const logger = pino({
  level: process.env['LOG_LEVEL'] ?? 'info',
  ...(transport !== undefined ? { transport } : {}),
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'body.password',
      'body.token',
      'body.otp',
      '*.password',
      '*.token',
      '*.secret',
      '*.accessToken',
      '*.refreshToken',
    ],
    censor: '[REDACTED]',
  },
});
