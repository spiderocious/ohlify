// Typed registry of outbox event types. Adding a new event = add to this enum
// + handle it in the outbox worker's switch.
export const OutboxEventType = {
  WALLET_FUNDING_SUCCEEDED: 'wallet.funding.succeeded',
  WALLET_FUNDING_FAILED: 'wallet.funding.failed',
  CALL_PAYMENT_RESERVED: 'call.payment.reserved',
  CALL_SETTLED: 'call.settled',
  CALL_REFUNDED: 'call.refunded',
  MINUTES_PURCHASED: 'minutes.purchased',
  WITHDRAWAL_REQUESTED: 'withdrawal.requested',
  WITHDRAWAL_COMPLETED: 'withdrawal.completed',
  WITHDRAWAL_REVERSED: 'withdrawal.reversed',
  REVIEW_POSTED: 'review.posted',
  REVIEW_HIDDEN: 'review.hidden',
  REVIEW_UNHIDDEN: 'review.unhidden',
  STRIKE_ISSUED_BY_ADMIN: 'strike.issued_by_admin',
  KYC_APPROVED: 'kyc.approved',
  KYC_REJECTED: 'kyc.rejected',
  // eslint-disable-next-line sonarjs/no-hardcoded-passwords -- event type, not a credential
  PASSWORD_RESET_REQUESTED_BY_ADMIN: 'auth.password_reset.requested_by_admin',
  // Push: a call is joinable. Fired when bookings.service confirms a
  // booking AND again when call-starter flips to waiting_for_parties.
  // The outbox push handler fans out to every device token registered
  // for `target_user_id` (the callee).
  PUSH_CALL_JOINABLE: 'push.call_joinable',
  // Push: an instant call is ringing for `target_user_id` (the callee).
  // Data-only, high priority — the mobile client renders the full-screen
  // incoming-call UI itself (notifee); no system-rendered notification.
  PUSH_INCOMING_CALL: 'push.incoming_call',
  PUSH_CALL_INVITE: 'push.call_invite',
  // Push: a ringing instant call stopped ringing (caller hung up, ring
  // window expired, or another device answered). Data-only — its sole job
  // is to dismiss the incoming-call UI on `target_user_id`'s devices.
  PUSH_CALL_CANCELLED: 'push.call_cancelled',
  // Push: visible "you missed a call from X" for `target_user_id`.
  PUSH_CALL_MISSED: 'push.call_missed',
  // ── Invite lifecycle ─────────────────────────────────────────────────────
  // Every hop in an invite is announced, so nobody sits on a screen waiting
  // for something that already resolved.
  //
  // Call invites: the professional is asked, then BOTH the inviter and the
  // invitee hear the outcome. The invitee's approval push is what makes their
  // phone ring — it reuses the incoming-call treatment, not a quiet banner.
  // Asks the professional to approve. Distinct from PUSH_CALL_INVITE, which
  // rings the already-approved invitee — this one only needs a decision.
  PUSH_CALL_INVITE_REQUESTED: 'push.call_invite.requested',
  PUSH_CALL_INVITE_APPROVED: 'push.call_invite.approved',
  PUSH_CALL_INVITE_REJECTED: 'push.call_invite.rejected',
  // Chat invites mirror calls exactly, minus the ringing: the professional
  // approves a guest before they can read the thread.
  PUSH_CHAT_INVITE: 'push.chat_invite',
  PUSH_CHAT_INVITE_APPROVED: 'push.chat_invite.approved',
  PUSH_CHAT_INVITE_REJECTED: 'push.chat_invite.rejected',
  // Admin campaign broadcast. One event per recipient — the outbox fans out by
  // `target_user_id`, and this is what actually reaches a phone: writing the
  // notification row alone left the campaign "sent" with nothing delivered.
  PUSH_CAMPAIGN: 'push.campaign',
  // Push: visible chat-message notification for `target_user_id`.
  PUSH_CHAT_MESSAGE: 'push.chat_message',
} as const;

export type OutboxEventType = (typeof OutboxEventType)[keyof typeof OutboxEventType];

export const OutboxAggregateType = {
  PAYMENT: 'payment',
  CALL: 'call',
  WITHDRAWAL: 'withdrawal',
  USER: 'user',
  CHAT: 'chat',
  CAMPAIGN: 'campaign',
} as const;

export type OutboxAggregateType = (typeof OutboxAggregateType)[keyof typeof OutboxAggregateType];
