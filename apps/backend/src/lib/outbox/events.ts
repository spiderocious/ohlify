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
} as const;

export type OutboxEventType = (typeof OutboxEventType)[keyof typeof OutboxEventType];

export const OutboxAggregateType = {
  PAYMENT: 'payment',
  CALL: 'call',
  WITHDRAWAL: 'withdrawal',
  USER: 'user',
} as const;

export type OutboxAggregateType = (typeof OutboxAggregateType)[keyof typeof OutboxAggregateType];
