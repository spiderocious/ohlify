import type { Response } from 'express';

import type { ApiError, ApiEnvelope } from '@shared/types/envelope.types.js';

export class ResponseUtil {
  static ok<T>(res: Response, data: T, meta?: Record<string, unknown>): Response {
    const body: ApiEnvelope<T> = meta ? { data, meta } : { data };
    return res.status(200).json(body);
  }

  static created<T>(res: Response, data: T): Response {
    return res.status(201).json({ data } satisfies ApiEnvelope<T>);
  }

  static accepted<T>(res: Response, data: T): Response {
    return res.status(202).json({ data } satisfies ApiEnvelope<T>);
  }

  static noContent(res: Response): Response {
    return res.status(204).end();
  }

  static error(res: Response, status: number, err: ApiError): Response {
    return res.status(status).json({ error: err } satisfies ApiEnvelope<never>);
  }
}
