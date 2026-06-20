import type { Request, Response } from 'express';

import { logger } from '@lib/logger.js';
import { ResponseUtil } from '@lib/response.js';
import { ERROR_CODES, severityFor } from '@shared/constants/error-codes.js';
import { resolveErrorMessage } from '@shared/constants/error-messages.js';
import { HTTP_STATUS } from '@shared/constants/http-status.js';

import { processAgoraWebhook } from './agora.webhook.service.js';

export const agoraWebhook = async (req: Request, res: Response): Promise<void> => {
  const sig = req.header('agora-signature-v2') ?? req.header('Agora-Signature-V2');
  const raw = req.body as Buffer;
  if (!Buffer.isBuffer(raw)) {
    logger.warn('agora webhook: body is not a Buffer — express.raw not mounted?');
    ResponseUtil.error(res, HTTP_STATUS.BAD_REQUEST, {
      errorCode: severityFor(ERROR_CODES.VALIDATION_ERROR),
      errorMessage: resolveErrorMessage(ERROR_CODES.VALIDATION_ERROR),
      reason: ERROR_CODES.VALIDATION_ERROR,
      fieldErrors: { body: ['Webhook body must be raw bytes'] },
    });
    return;
  }
  const result = await processAgoraWebhook({
    signatureHeader: sig,
    rawBody: raw,
  });
  if (!result.accepted) {
    const reason = result.reason ?? ERROR_CODES.UNAUTHORIZED;
    ResponseUtil.error(res, HTTP_STATUS.UNAUTHORIZED, {
      errorCode: severityFor(reason),
      errorMessage: resolveErrorMessage(reason),
      reason,
    });
    return;
  }
  res.status(200).json({ ok: true });
};
