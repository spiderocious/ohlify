import type { Response } from 'express';

import type { ApiError, ApiEnvelope } from '@shared/types/envelope.types.js';

// Per conventions.md §6: bigint values serialize as JSON number when within
// safe-integer range, else as string. Express's `res.json` invokes
// JSON.stringify which throws on bigint, so we pre-walk the body and convert
// in place (creating a copy where needed).
const SAFE_BIGINT_MAX = BigInt(Number.MAX_SAFE_INTEGER);
const SAFE_BIGINT_MIN = -SAFE_BIGINT_MAX;

const normalizeBigints = (value: unknown): unknown => {
  if (typeof value === 'bigint') {
    if (value >= SAFE_BIGINT_MIN && value <= SAFE_BIGINT_MAX) {
      return Number(value);
    }
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value.map(normalizeBigints);
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = normalizeBigints(v);
    }
    return out;
  }
  return value;
};

export class ResponseUtil {
  static ok<T>(res: Response, data: T, meta?: Record<string, unknown>): Response {
    const body: ApiEnvelope<T> = meta ? { data, meta } : { data };
    return res.status(200).json(normalizeBigints(body));
  }

  static created<T>(res: Response, data: T): Response {
    return res.status(201).json(normalizeBigints({ data } satisfies ApiEnvelope<T>));
  }

  static accepted<T>(res: Response, data: T): Response {
    return res.status(202).json(normalizeBigints({ data } satisfies ApiEnvelope<T>));
  }

  static noContent(res: Response): Response {
    return res.status(204).end();
  }

  static error(res: Response, status: number, err: ApiError): Response {
    return res.status(status).json({ error: err } satisfies ApiEnvelope<never>);
  }
}
