// Typed registry of outbox event types. Adding a new event = add to this enum
// + handle it in the outbox worker's switch.
export const OutboxEventType = {
  WALLET_FUNDING_SUCCEEDED: 'wallet.funding.succeeded',
  WALLET_FUNDING_FAILED: 'wallet.funding.failed',
  CALL_PAYMENT_RESERVED: 'call.payment.reserved',
  CALL_SETTLED: 'call.settled',
  CALL_REFUNDED: 'call.refunded',
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
} as const;

export type OutboxEventType = (typeof OutboxEventType)[keyof typeof OutboxEventType];

export const OutboxAggregateType = {
  PAYMENT: 'payment',
  CALL: 'call',
  WITHDRAWAL: 'withdrawal',
  USER: 'user',
} as const;

export type OutboxAggregateType = (typeof OutboxAggregateType)[keyof typeof OutboxAggregateType];
