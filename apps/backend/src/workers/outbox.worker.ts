import crypto from 'node:crypto';

import * as authRepo from '@features/auth/auth.repo.js';
import * as deviceTokensRepo from '@features/profile/device-tokens.repo.js';
import { pool } from '@lib/db/pool.js';
import { logger } from '@lib/logger.js';
import { publish, RealtimeEvent, type RealtimeMessage } from '@lib/realtime/index.js';
import { notificationService } from '@lib/notifications/notification.service.js';
import { OutboxEventType } from '@lib/outbox/events.js';
import { getPushProvider, type PushNotification } from '@lib/push/index.js';

// Polls the outbox table and "publishes" events. In Slice A there are no real
// consumers — the worker simply marks rows published and logs them. Slice B
// wires email / push / websocket fanout into the switch below.
//
// Concurrency-safe: SELECT ... FOR UPDATE SKIP LOCKED lets multiple worker
// instances run in parallel without claiming the same row twice. Crash-safe:
// rows we claim but fail to publish stay unclaimed (FOR UPDATE releases on
// rollback) so the next poll retries them.

const POLL_INTERVAL_MS = 500;
const BATCH_SIZE = 50;
const MAX_ATTEMPTS = 8;

interface OutboxRow {
  id: string;
  aggregate_type: string;
  aggregate_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  attempt_count: number;
}

// Resolve a user email from a payload that may carry user_id / payer_user_id /
// payee_user_id depending on the event. Returns null if no user context is
// present or the user can't be found.
const resolveRecipientEmail = async (
  payload: Record<string, unknown>,
  userKey: 'user_id' | 'payer_user_id' | 'payee_user_id',
): Promise<string | null> => {
  const userId = payload[userKey];
  if (typeof userId !== 'string' || userId.length === 0) return null;
  const user = await authRepo.findUserById(userId);
  return user?.email ?? null;
};

const asString = (v: unknown): string | null => (typeof v === 'string' ? v : null);

// Maps an outbox event to one or more email sends. Returns silently when the
// event has no email-worthy recipient (e.g. CALL_PAYMENT_RESERVED for an
// unauthenticated payload).
const dispatchToEmail = async (row: OutboxRow): Promise<void> => {
  const payload = row.payload;
  const amount = asString(payload['amount_kobo']) ?? '0';
  switch (row.event_type) {
    case OutboxEventType.CALL_PAYMENT_RESERVED: {
      const email = await resolveRecipientEmail(payload, 'user_id');
      if (email) {
        await notificationService.sendWalletEvent(email, 'call_payment_reserved', {
          amountKobo: amount,
        });
      }
      return;
    }
    case OutboxEventType.CALL_SETTLED: {
      const payeeEmail = await resolveRecipientEmail(payload, 'payee_user_id');
      const netKobo = asString(payload['net_kobo']) ?? amount;
      if (payeeEmail) {
        await notificationService.sendWalletEvent(payeeEmail, 'call_settled', {
          amountKobo: netKobo,
        });
      }
      return;
    }
    case OutboxEventType.CALL_REFUNDED: {
      const payerEmail = await resolveRecipientEmail(payload, 'payer_user_id');
      if (payerEmail) {
        await notificationService.sendWalletEvent(payerEmail, 'call_refunded', {
          amountKobo: amount,
        });
      }
      return;
    }
    case OutboxEventType.WITHDRAWAL_REQUESTED: {
      const email = await resolveRecipientEmail(payload, 'user_id');
      if (email) {
        await notificationService.sendWalletEvent(email, 'withdrawal_requested', {
          amountKobo: amount,
        });
      }
      return;
    }
    case OutboxEventType.WITHDRAWAL_COMPLETED: {
      const email = await resolveRecipientEmail(payload, 'user_id');
      if (email) {
        await notificationService.sendWalletEvent(email, 'withdrawal_completed', {
          amountKobo: amount,
        });
      }
      return;
    }
    case OutboxEventType.WITHDRAWAL_REVERSED: {
      const email = await resolveRecipientEmail(payload, 'user_id');
      if (email) {
        await notificationService.sendWalletEvent(email, 'withdrawal_reversed', {
          amountKobo: amount,
        });
      }
      return;
    }
    default:
      // No-op for non-email events. Funding success/failure already emails
      // through the existing slice A path; left untouched.
      return;
  }
};

/**
 * Maps a `push.*` outbox event to the notification to fan out, or null
 * for non-push events. Data-only messages (no title/body) render nothing
 * — the mobile background handler owns the UX (ring, dismiss).
 */
const buildPushNotification = (row: OutboxRow): PushNotification | null => {
  const payload = row.payload;
  switch (row.event_type) {
    case OutboxEventType.PUSH_CALL_JOINABLE: {
      const peerName = asString(payload['peer_full_name']) ?? 'A caller';
      return {
        title: 'Your call is ready',
        body: `${peerName} is waiting in the room.`,
        category: 'call.joinable',
        androidChannelId: 'calls',
        data: {
          type: 'call.joinable',
          call_id: asString(payload['call_id']) ?? '',
          peer_user_id: asString(payload['peer_user_id']) ?? '',
          peer_full_name: peerName,
          peer_avatar_url: asString(payload['peer_avatar_url']) ?? '',
          kind: asString(payload['kind']) ?? 'audio',
          // Polite-decline window opens at the booking's start_at — clients
          // use this to grey-out / hide the decline button after expiry.
          polite_decline_until: asString(payload['polite_decline_until']) ?? '',
        },
      };
    }
    // Instant call ringing — data-only + high priority: the client wakes
    // and renders the full-screen ring itself (notifee / CallKit later).
    case OutboxEventType.PUSH_INCOMING_CALL:
      return {
        category: 'call.incoming',
        data: {
          type: 'call.incoming',
          call_id: asString(payload['call_id']) ?? '',
          caller_user_id: asString(payload['caller_user_id']) ?? '',
          caller_full_name: asString(payload['caller_full_name']) ?? 'Ohlify caller',
          caller_avatar_url: asString(payload['caller_avatar_url']) ?? '',
          call_type: asString(payload['call_type']) ?? 'audio',
          ring_expires_at: asString(payload['ring_expires_at']) ?? '',
        },
      };
    // An approved invitee is being rung into an existing call. Same shape as
    // an incoming call because the invitee's UI is the same full-screen ring —
    // what differs is that they are joining a room already in progress.
    case OutboxEventType.PUSH_CALL_INVITE:
      return {
        category: 'call.incoming',
        data: {
          type: 'call.invite',
          call_id: asString(payload['call_id']) ?? '',
          participant_id: asString(payload['participant_id']) ?? '',
          caller_user_id: asString(payload['inviter_user_id']) ?? '',
          caller_full_name: asString(payload['inviter_full_name']) ?? 'Someone',
          caller_avatar_url: asString(payload['inviter_avatar_url']) ?? '',
          call_type: asString(payload['call_type']) ?? 'audio',
          ring_expires_at: asString(payload['ring_expires_at']) ?? '',
        },
      };
    // Stop-ringing signal — data-only; clients dismiss the ring UI for
    // this call_id (caller hung up / answered elsewhere / timed out).
    case OutboxEventType.PUSH_CALL_CANCELLED:
      return {
        category: 'call.cancelled',
        data: {
          type: 'call.cancelled',
          call_id: asString(payload['call_id']) ?? '',
          reason: asString(payload['reason']) ?? 'cancelled',
        },
      };
    case OutboxEventType.PUSH_CALL_MISSED: {
      const callerName = asString(payload['caller_full_name']) ?? 'Someone';
      return {
        title: 'Missed call',
        body: `${callerName} tried to call you.`,
        category: 'call.missed',
        androidChannelId: 'calls',
        data: {
          type: 'call.missed',
          call_id: asString(payload['call_id']) ?? '',
          caller_user_id: asString(payload['caller_user_id']) ?? '',
          caller_full_name: callerName,
          caller_avatar_url: asString(payload['caller_avatar_url']) ?? '',
          call_type: asString(payload['call_type']) ?? 'audio',
        },
      };
    }
    case OutboxEventType.PUSH_CHAT_MESSAGE: {
      const senderName = asString(payload['sender_full_name']) ?? 'New message';
      return {
        title: senderName,
        body: asString(payload['preview']) ?? 'Sent you a message',
        category: 'chat.message',
        androidChannelId: 'chat',
        data: {
          type: 'chat.message',
          conversation_id: asString(payload['conversation_id']) ?? '',
          message_id: asString(payload['message_id']) ?? '',
          sender_user_id: asString(payload['sender_user_id']) ?? '',
          sender_full_name: senderName,
          sender_avatar_url: asString(payload['sender_avatar_url']) ?? '',
        },
      };
    }
    default:
      return null;
  }
};

/**
 * Fans a `push.*` outbox event out to every device token registered for
 * the payload's `target_user_id`. The provider falls back to a no-op
 * when FCM creds aren't set, so this is safe to call regardless.
 */
const dispatchToPush = async (row: OutboxRow): Promise<void> => {
  const notification = buildPushNotification(row);
  if (notification === null) return;

  const targetUserId = asString(row.payload['target_user_id']);
  if (targetUserId === null) {
    logger.warn(
      { outboxId: row.id, eventType: row.event_type },
      'push event missing target_user_id — skipping',
    );
    return;
  }
  const tokens = await deviceTokensRepo.findActiveTokensForUser(targetUserId);
  if (tokens.length === 0) return;

  const provider = await getPushProvider();
  if (!provider.isEnabled()) return;
  const result = await provider.sendToTokens(
    tokens.map((t) => t.token),
    notification,
  );
  // Prune dead tokens so the next event doesn't re-attempt them.
  await Promise.all(result.invalidTokens.map((t) => deviceTokensRepo.deleteByToken(t)));
  logger.info(
    {
      outboxId: row.id,
      eventType: row.event_type,
      delivered: result.delivered,
      pruned: result.invalidTokens.length,
    },
    'push event dispatched',
  );
};

/**
 * Maps an outbox event to the realtime hint its owner should receive.
 *
 * Hints only — the client responds by invalidating a query key and refetching,
 * so a lost signal costs a delayed refresh rather than a wrong balance. That is
 * why nothing here carries an amount or a message body.
 *
 * Returns null for events nobody needs to be told about live.
 */
const realtimeHintFor = (row: OutboxRow): { userId: string; message: RealtimeMessage } | null => {
  const payload = row.payload;
  const target = asString(payload['target_user_id']);
  const owner = asString(payload['user_id']);

  const hint = (
    userId: string | null,
    type: RealtimeEvent,
    data?: Record<string, string>,
  ): { userId: string; message: RealtimeMessage } | null =>
    userId ? { userId, message: data ? { type, data } : { type } } : null;

  switch (row.event_type) {
    case OutboxEventType.WALLET_FUNDING_SUCCEEDED:
    case OutboxEventType.WALLET_FUNDING_FAILED:
    case OutboxEventType.WITHDRAWAL_REQUESTED:
    case OutboxEventType.WITHDRAWAL_COMPLETED:
    case OutboxEventType.WITHDRAWAL_REVERSED:
    case OutboxEventType.CALL_PAYMENT_RESERVED:
    case OutboxEventType.CALL_REFUNDED:
      return hint(owner, RealtimeEvent.WALLET_CHANGED);
    case OutboxEventType.MINUTES_PURCHASED:
      return hint(owner, RealtimeEvent.MINUTES_CHANGED);
    case OutboxEventType.CALL_SETTLED:
      return hint(owner, RealtimeEvent.CALL_ENDED);
    // An invite rings the invitee exactly like an incoming call does — same
    // hint, same client behaviour; only the push payload differs.
    case OutboxEventType.PUSH_INCOMING_CALL:
    case OutboxEventType.PUSH_CALL_INVITE: {
      const callId = asString(payload['call_id']);
      return hint(target, RealtimeEvent.CALL_INCOMING, callId ? { call_id: callId } : undefined);
    }
    case OutboxEventType.PUSH_CALL_CANCELLED: {
      const callId = asString(payload['call_id']);
      return hint(target, RealtimeEvent.CALL_CANCELLED, callId ? { call_id: callId } : undefined);
    }
    case OutboxEventType.PUSH_CHAT_MESSAGE: {
      const conversationId = asString(payload['conversation_id']);
      return hint(
        target,
        RealtimeEvent.CHAT_MESSAGE,
        conversationId ? { conversation_id: conversationId } : undefined,
      );
    }
    case OutboxEventType.PUSH_CALL_MISSED:
      return hint(target, RealtimeEvent.BADGES_CHANGED);
    default:
      return null;
  }
};

const dispatchToRealtime = (row: OutboxRow): void => {
  const hint = realtimeHintFor(row);
  if (!hint) return;
  publish(hint.userId, hint.message);
  // Anything worth a live hint also moves a badge; the client coalesces both
  // into one refetch, so the extra signal is cheap and keeps the tab bar honest.
  if (hint.message.type !== RealtimeEvent.BADGES_CHANGED) {
    publish(hint.userId, { type: RealtimeEvent.BADGES_CHANGED });
  }
};

const publishOne = async (row: OutboxRow): Promise<void> => {
  await dispatchToEmail(row);
  await dispatchToPush(row);
  dispatchToRealtime(row);
  logger.info(
    {
      outboxId: row.id,
      aggregateType: row.aggregate_type,
      aggregateId: row.aggregate_id,
      eventType: row.event_type,
    },
    'outbox event published',
  );
};

const tickOnce = async (): Promise<void> => {
  let client;
  try {
    client = await pool.connect();
  } catch (err) {
    logger.warn({ err }, 'outbox worker pool.connect failed; retry next tick');
    return;
  }
  try {
    await client.query('BEGIN');
    const claimed = await client.query<OutboxRow>(
      `SELECT id, aggregate_type, aggregate_id, event_type, payload, attempt_count
         FROM outbox
        WHERE published_at IS NULL AND available_at <= now()
        ORDER BY available_at ASC
        LIMIT ${BATCH_SIZE}
        FOR UPDATE SKIP LOCKED`,
    );

    for (const row of claimed.rows) {
      try {
        await publishOne(row);
        await client.query(
          `UPDATE outbox SET published_at = now(), last_error = NULL WHERE id = $1`,
          [row.id],
        );
      } catch (err) {
        const next = row.attempt_count + 1;
        // Exponential backoff with jitter: min(2^n × 250ms + jitter, 30s).
        // Math.random is fine — this is a backoff jitter, not a security
        // primitive. (sonar pseudo-random rule false positive.)
        const jitter = crypto.randomInt(0, 250);
        const backoffMs = Math.min(2 ** Math.min(next, 10) * 250 + jitter, 30_000);
        const message = err instanceof Error ? err.message : String(err);
        const targetStatus = next >= MAX_ATTEMPTS ? `permanent: ${message}` : message;
        await client.query(
          `UPDATE outbox
              SET attempt_count = $2,
                  last_error    = $3,
                  available_at  = now() + ($4 * INTERVAL '1 millisecond')
            WHERE id = $1`,
          [row.id, next, targetStatus, backoffMs],
        );
      }
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.warn({ err }, 'outbox worker tick failed');
  } finally {
    client.release();
  }
};

interface OutboxWorkerHandle {
  stop: () => Promise<void>;
}

export const startOutboxWorker = (): OutboxWorkerHandle => {
  let stopped = false;
  let timer: NodeJS.Timeout | null = null;

  const loop = async (): Promise<void> => {
    if (stopped) return;
    try {
      await tickOnce();
    } catch (err) {
      logger.warn({ err }, 'outbox worker loop iteration crashed; continuing');
    }
    if (!stopped) {
      timer = setTimeout(() => {
        void loop();
      }, POLL_INTERVAL_MS);
      timer.unref();
    }
  };

  void loop();
  logger.info({ pollMs: POLL_INTERVAL_MS, batch: BATCH_SIZE }, 'outbox worker started');

  return {
    stop: () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      return Promise.resolve();
    },
  };
};
