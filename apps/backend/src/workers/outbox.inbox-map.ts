import type { CreateNotificationInput } from '@features/notifications/notifications.repo.js';
import { NotificationKind } from '@features/notifications/notifications.types.js';
import { DeeplinkTarget, encodeDeeplink } from '@lib/deeplink.js';
import { OutboxEventType } from '@lib/outbox/events.js';

/**
 * Which outbox events earn a row in the notification panel.
 *
 * The selection rule is deliberate and predates this file
 * (`notifications.types.ts`): a row is warranted when something happened TO
 * this user that they would want to find again, and it has **no other natural
 * home**. Routine activity is excluded on purpose — new messages, missed calls
 * and ordinary wallet movements are already listed in the Chats tab, Calls tab
 * and wallet history, so mirroring them here buries the rows that matter.
 *
 * Those events still push. Push is the interrupt; the panel is the record.
 * They are different jobs and the same event can warrant one without the other.
 *
 * Returns null for anything that should not appear.
 */

const asString = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);

interface MapInput {
  eventType: string;
  payload: Record<string, unknown>;
}

/** Every entry names its recipient explicitly — none is inferred from role. */
export const inboxEntryFor = (input: MapInput): Omit<CreateNotificationInput, 'outboxId'> | null => {
  const { payload } = input;
  const owner = asString(payload['user_id']);
  const target = asString(payload['target_user_id']);

  switch (input.eventType) {
    // ── Money exceptions ────────────────────────────────────────────────────
    // The ledger already shows the movement; what it cannot show is WHY a
    // withdrawal failed, which is the part the user needs to act on.
    case OutboxEventType.WITHDRAWAL_REVERSED: {
      if (!owner) return null;
      return {
        userId: owner,
        kind: NotificationKind.WITHDRAWAL_FAILED,
        title: 'Withdrawal reversed',
        body: 'Your withdrawal could not be completed and the money is back in your wallet.',
        deeplink: encodeDeeplink({ target: DeeplinkTarget.WITHDRAWALS }),
      };
    }
    case OutboxEventType.CALL_REFUNDED: {
      const callId = asString(payload['call_id']);
      const payer = asString(payload['payer_user_id']) ?? owner;
      if (!payer) return null;
      return {
        userId: payer,
        kind: NotificationKind.REFUND_ISSUED,
        title: 'Refund issued',
        body: 'A call was refunded to your wallet.',
        deeplink: callId
          ? encodeDeeplink({ target: DeeplinkTarget.CALL_DETAIL, params: { call_id: callId } })
          : encodeDeeplink({ target: DeeplinkTarget.WALLET }),
      };
    }

    // ── Account status ──────────────────────────────────────────────────────
    case OutboxEventType.KYC_APPROVED: {
      if (!owner) return null;
      return {
        userId: owner,
        kind: NotificationKind.KYC_APPROVED,
        title: 'You’re verified',
        body: 'Your identity check passed. Clients can now find and book you.',
        deeplink: encodeDeeplink({ target: DeeplinkTarget.PROFILE }),
      };
    }
    case OutboxEventType.KYC_REJECTED: {
      if (!owner) return null;
      return {
        userId: owner,
        kind: NotificationKind.KYC_REJECTED,
        title: 'Verification needs attention',
        body: 'Something on your verification needs fixing. Tap to see what.',
        deeplink: encodeDeeplink({ target: DeeplinkTarget.KYC }),
      };
    }

    // ── Moderation ──────────────────────────────────────────────────────────
    case OutboxEventType.STRIKE_ISSUED_BY_ADMIN: {
      if (!owner) return null;
      return {
        userId: owner,
        kind: NotificationKind.STRIKE_ISSUED,
        title: 'A strike was added to your account',
        body: 'Tap to read why and what it affects.',
        deeplink: encodeDeeplink({ target: DeeplinkTarget.STRIKES }),
      };
    }

    // ── Social ──────────────────────────────────────────────────────────────
    case OutboxEventType.REVIEW_POSTED: {
      const professionalId = asString(payload['professional_id']) ?? target;
      if (!professionalId) return null;
      return {
        userId: professionalId,
        kind: NotificationKind.REVIEW_RECEIVED,
        title: 'You got a new review',
        body: 'A client left feedback on a call.',
        deeplink: encodeDeeplink({
          target: DeeplinkTarget.PROFESSIONAL,
          params: { id: professionalId },
        }),
      };
    }

    // ── Invites ─────────────────────────────────────────────────────────────
    // These DO earn a row despite being "activity": an invite is a decision
    // someone is waiting on, and a pending approval has no other home — unlike
    // a message, which the Chats tab already lists.
    case OutboxEventType.PUSH_CALL_INVITE_REQUESTED: {
      if (!target) return null;
      const callId = asString(payload['call_id']);
      const inviteeName = asString(payload['invitee_full_name']) ?? 'someone';
      return {
        userId: target,
        kind: NotificationKind.CALL_INVITE_REQUESTED,
        title: 'Someone wants to join your call',
        body: `${asString(payload['inviter_full_name']) ?? 'Someone'} wants to add ${inviteeName}.`,
        deeplink: callId
          ? encodeDeeplink({ target: DeeplinkTarget.CALL_DETAIL, params: { call_id: callId } })
          : encodeDeeplink({ target: DeeplinkTarget.CALLS }),
        // Drives the Approve / Reject buttons on the row. Without the ids the
        // panel can only deep-link, and the decision needs another screen.
        metadata: {
          action: 'call_invite',
          call_id: callId ?? '',
          participant_id: asString(payload['participant_id']) ?? '',
        },
      };
    }
    case OutboxEventType.PUSH_CHAT_INVITE: {
      if (!target) return null;
      const conversationId = asString(payload['conversation_id']);
      const inviteeName = asString(payload['invitee_full_name']) ?? 'someone';
      return {
        userId: target,
        kind: NotificationKind.CHAT_INVITE_REQUESTED,
        title: 'Someone wants to join your chat',
        body: `${asString(payload['inviter_full_name']) ?? 'Someone'} wants to add ${inviteeName}.`,
        deeplink: conversationId
          ? encodeDeeplink({
              target: DeeplinkTarget.CHAT_THREAD,
              params: { conversation_id: conversationId },
            })
          : encodeDeeplink({ target: DeeplinkTarget.CHATS }),
        metadata: {
          action: 'chat_invite',
          conversation_id: conversationId ?? '',
          participant_id: asString(payload['participant_id']) ?? '',
        },
      };
    }
    case OutboxEventType.PUSH_CHAT_INVITE_APPROVED:
    case OutboxEventType.PUSH_CHAT_INVITE_REJECTED: {
      if (!target) return null;
      const conversationId = asString(payload['conversation_id']);
      const approved = input.eventType === OutboxEventType.PUSH_CHAT_INVITE_APPROVED;
      return {
        userId: target,
        kind: approved
          ? NotificationKind.CHAT_INVITE_APPROVED
          : NotificationKind.CHAT_INVITE_REJECTED,
        title: approved ? 'Added to the chat' : 'Invite declined',
        body: asString(payload['body']) ?? '',
        deeplink: conversationId
          ? encodeDeeplink({
              target: DeeplinkTarget.CHAT_THREAD,
              params: { conversation_id: conversationId },
            })
          : encodeDeeplink({ target: DeeplinkTarget.CHATS }),
      };
    }
    case OutboxEventType.PUSH_CALL_INVITE_REJECTED: {
      if (!target) return null;
      const callId = asString(payload['call_id']);
      return {
        userId: target,
        kind: NotificationKind.CALL_INVITE_REJECTED,
        title: 'Invite declined',
        body: `The professional declined to add ${asString(payload['invitee_full_name']) ?? 'that person'}.`,
        deeplink: callId
          ? encodeDeeplink({ target: DeeplinkTarget.CALL_DETAIL, params: { call_id: callId } })
          : encodeDeeplink({ target: DeeplinkTarget.CALLS }),
      };
    }

    default:
      return null;
  }
};
