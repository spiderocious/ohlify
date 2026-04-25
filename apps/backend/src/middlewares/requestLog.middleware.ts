import type { IncomingMessage, ServerResponse } from 'node:http';

import { pinoHttp } from 'pino-http';

import { requestContext } from '@lib/http/requestContext.js';
import { logger } from '@lib/logger.js';

export const requestLogMiddleware = pinoHttp({
  logger,
  genReqId: () => requestContext.getRequestId(),
  customLogLevel: (_req: IncomingMessage, res: ServerResponse) => {
    if (res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  serializers: {
    req: (req: IncomingMessage & { url?: string; method?: string }) => ({
      method: req.method,
      url: req.url,
    }),
    res: (res: ServerResponse) => ({ statusCode: res.statusCode }),
  },
});
