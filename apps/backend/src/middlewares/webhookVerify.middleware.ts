import crypto from 'node:crypto';

import type { Request, Response, NextFunction, RequestHandler } from 'express';

import { ResponseUtil } from '@lib/response.js';

import { env } from '../env.js';

export const verifyPaystackWebhook: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const sig = req.header('x-paystack-signature');
  const raw = (req as Request & { rawBody?: Buffer }).rawBody;

  if (!sig || !raw) {
    ResponseUtil.error(res, 401, { code: 'forbidden', message: 'Missing webhook signature' });
    return;
  }

  const expected = crypto
    .createHmac('sha512', env.PAYSTACK_WEBHOOK_SECRET)
    .update(raw)
    .digest('hex');

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);

  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    ResponseUtil.error(res, 401, { code: 'forbidden', message: 'Invalid webhook signature' });
    return;
  }

  next();
};
