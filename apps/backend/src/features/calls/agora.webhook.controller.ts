import type { Request, Response } from 'express';

import { logger } from '@lib/logger.js';

import { processAgoraWebhook } from './agora.webhook.service.js';

export const agoraWebhook = async (req: Request, res: Response): Promise<void> => {
  const sig = req.header('agora-signature-v2') ?? req.header('Agora-Signature-V2');
  const raw = req.body as Buffer;
  if (!Buffer.isBuffer(raw)) {
    logger.warn('agora webhook: body is not a Buffer — express.raw not mounted?');
    res.status(400).json({ error: { code: 'invalid_body' } });
    return;
  }
  const result = await processAgoraWebhook({
    signatureHeader: sig,
    rawBody: raw,
  });
  if (!result.accepted) {
    res.status(401).json({ error: { code: result.reason ?? 'rejected' } });
    return;
  }
  res.status(200).json({ ok: true });
};
