import type { Request, Response, RequestHandler } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { bail } from '@lib/http/bail.js';
import { verifyPaystackSignature } from '@lib/paystack/webhook-verify.js';
import { ResponseUtil } from '@lib/response.js';
import { ERROR_CODES, severityFor } from '@shared/constants/error-codes.js';
import { resolveErrorMessage } from '@shared/constants/error-messages.js';
import { HTTP_STATUS } from '@shared/constants/http-status.js';
import { MESSAGE_KEYS } from '@shared/constants/message-keys.js';

import * as service from './payments.service.js';
import { logger } from '../../lib/logger.js';

export const getByReference: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.getByReference(String(req.params['reference']), req.userId!);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

// Webhook handler. The route MUST mount express.raw() before this so
// req.body is a Buffer and signature verification operates on bytes.
export const paystackWebhook: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.header('x-paystack-signature');
  const rawBody = req.body as Buffer | undefined;
  if (!Buffer.isBuffer(rawBody) || rawBody.length === 0) {
    ResponseUtil.error(res, HTTP_STATUS.BAD_REQUEST, {
      errorCode: severityFor(ERROR_CODES.VALIDATION_ERROR),
      errorMessage: resolveErrorMessage(ERROR_CODES.VALIDATION_ERROR),
      reason: ERROR_CODES.VALIDATION_ERROR,
      fieldErrors: { body: ['Webhook body must be raw bytes'] },
    });
    return;
  }

  if (!verifyPaystackSignature(rawBody, signature, req.query?.webhookKey as string)) {
    ResponseUtil.error(res, HTTP_STATUS.UNAUTHORIZED, {
      errorCode: severityFor(ERROR_CODES.UNAUTHORIZED),
      errorMessage: resolveErrorMessage(ERROR_CODES.UNAUTHORIZED),
      reason: ERROR_CODES.UNAUTHORIZED,
    });
    return;
  }

  const result = await service.processWebhook({
    signatureHeader: signature ?? '',
    rawBody,
  });
  logger.info({ result }, 'paystack webhook processing result');
  if (!result.accepted) {
    ResponseUtil.error(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      errorCode: severityFor(ERROR_CODES.INTERNAL),
      errorMessage: resolveErrorMessage(ERROR_CODES.INTERNAL),
      reason: ERROR_CODES.INTERNAL,
    });
    return;
  }

  // Always 200 on accepted (including duplicates) — Paystack retries on non-2xx.
  ResponseUtil.ok(res, { received: true, message: MESSAGE_KEYS.WEBHOOK_ACCEPTED });
});
