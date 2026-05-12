import {
  AgoraEventType,
  type AgoraNotificationEnvelope,
  verifyAgoraWebhookSignature,
} from '@lib/agora/index.js';
import { pool } from '@lib/db/pool.js';
import { logger } from '@lib/logger.js';

import * as repo from './calls.repo.js';
import { resolveCall } from './calls.resolver.js';
import { CallStatus } from './calls.types.js';

interface ProcessInput {
  signatureHeader: string | undefined;
  rawBody: Buffer;
}

interface ProcessResult {
  accepted: boolean;
  reason?: string;
}

// Agora notification webhooks are advisory ground truth — we already track
// joins/leaves via our own /calls/:id/join + /leave endpoints, but Agora
// tells us "the channel went empty" which we use to resolve stuck calls
// when one side disconnected without telling us.
//
// Payload shape varies by event type; what we use:
//   eventType=103 (user_join): { channelName, uid, ... }
//   eventType=104 (user_leave): { channelName, uid, ... }
//   eventType=102 (channel_destroy): { channelName, ... }
//
// The channelName maps to a call via calls.agora_channel_name.
//
// We DO NOT trust Agora UID → user mapping for join/leave because our own API
// is more authoritative (we know which session token issued which uid). We
// use Agora events ONLY to detect "the channel ended without anyone hitting
// /leave" (channel_destroy → resolve as stuck_call).

export const processAgoraWebhook = async (input: ProcessInput): Promise<ProcessResult> => {
  if (!verifyAgoraWebhookSignature(input.rawBody, input.signatureHeader)) {
    return { accepted: false, reason: 'invalid_signature' };
  }
  let parsed: AgoraNotificationEnvelope;
  try {
    parsed = JSON.parse(input.rawBody.toString('utf8')) as AgoraNotificationEnvelope;
  } catch {
    return { accepted: false, reason: 'malformed_json' };
  }

  const eventType = parsed.eventType;
  const channelName = parsed.payload?.channelName;
  if (typeof channelName !== 'string') {
    logger.info(
      { eventType, noticeId: parsed.noticeId },
      'agora event without channelName; skipping',
    );
    return { accepted: true, reason: 'no_channel' };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const call = await repo.findByChannelName(client, channelName);
    if (!call) {
      logger.info({ eventType, channelName }, 'agora event for unknown channel; ignoring');
      await client.query('ROLLBACK');
      return { accepted: true, reason: 'unknown_channel' };
    }

    await repo.recordEvent(client, {
      callId: call.id,
      eventType: 'agora_webhook',
      payload: {
        agora_event_type: eventType,
        notice_id: parsed.noticeId,
        payload: parsed.payload,
      },
    });

    if (
      eventType === AgoraEventType.CHANNEL_DESTROY &&
      (call.status === CallStatus.IN_PROGRESS || call.status === CallStatus.WAITING_FOR_PARTIES)
    ) {
      // Channel emptied. Use 'no_show_grace' (not 'both_left') so resolveCall
      // picks the right terminal status from the join state:
      //   - neither joined → NO_SHOW_BOTH
      //   - only caller joined → NO_SHOW_CALLEE (pro takes strike)
      //   - only callee joined → NO_SHOW_CALLER (configurable split)
      //   - both joined → falls back internally to both_left logic
      // Passing 'both_left' here would silently miss the strike on a pro who
      // joined briefly and bailed before the caller arrived. See N-CALLS-03.
      try {
        await resolveCall(client, call.id, 'no_show_grace');
      } catch (err) {
        logger.warn({ err, callId: call.id }, 'agora channel_destroy resolve failed');
      }
    }

    await client.query('COMMIT');
    return { accepted: true };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error({ err }, 'agora webhook tx failed');
    return { accepted: false, reason: 'tx_error' };
  } finally {
    client.release();
  }
};
