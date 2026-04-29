import crypto from 'node:crypto';

import { env } from '../../env.js';

// Agora notification webhooks ("Notifications V2"). Each delivery has a
// signature header `Agora-Signature-V2` containing HMAC-SHA256(secret, body).
//
// Reference: https://docs.agora.io/en/agora-platform/reference/notifications/configure
//
// We treat verification as advisory in dev (no secret set) and required in
// production. The handler refuses without a valid signature when the secret
// is configured.

export const verifyAgoraWebhookSignature = (
  rawBody: Buffer,
  signatureHeader: string | undefined,
): boolean => {
  const secret = env.AGORA_WEBHOOK_SECRET;
  if (!secret) {
    // Dev mode: skip verification, but log so it's visible in dashboards.
    return true;
  }
  if (!signatureHeader) return false;
  const computed = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  // timingSafeEqual requires equal lengths.
  if (computed.length !== signatureHeader.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
};

// Agora event types we care about. The full list is huge; we only act on a
// handful. Reference: https://docs.agora.io/en/agora-platform/reference/notifications/events
export const AgoraEventType = {
  CHANNEL_CREATE: 101, // channel created (first user joined)
  CHANNEL_DESTROY: 102, // last user left, channel closed
  USER_JOIN: 103,
  USER_LEAVE: 104,
} as const;

export type AgoraEventType = (typeof AgoraEventType)[keyof typeof AgoraEventType];

export interface AgoraNotificationEnvelope {
  noticeId: string;
  productId: number;
  eventType: number;
  notifyMs: number;
  payload: {
    channelName?: string;
    uid?: number;
    clientSeq?: number;
    ts?: number;
    reason?: number;
    [k: string]: unknown;
  };
}
