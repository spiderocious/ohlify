/**
 * What earns a row in the notification panel.
 *
 * The test is: did something happen TO this user that they would want to find
 * again, and does it have no other natural home? Money exceptions, account
 * status, moderation, campaigns, and social qualify. Routine activity does not
 * — new messages, missed calls, and ordinary wallet movements are already
 * recorded by the Chats tab, Calls tab, and wallet history, so duplicating them
 * here would bury the rows that matter under noise.
 */
export const NotificationKind = {
  // Money exceptions — the ledger shows the row, not the reason.
  WITHDRAWAL_REJECTED: 'withdrawal.rejected',
  WITHDRAWAL_FAILED: 'withdrawal.failed',
  REFUND_ISSUED: 'refund.issued',
  // Account status.
  KYC_APPROVED: 'kyc.approved',
  KYC_REJECTED: 'kyc.rejected',
  // Moderation.
  STRIKE_ISSUED: 'strike.issued',
  STRIKE_RESOLVED: 'strike.resolved',
  ACCOUNT_SUSPENDED: 'account.suspended',
  // Social.
  REVIEW_RECEIVED: 'review.received',
  // Scheduling, when the other party acts.
  BOOKING_CANCELLED: 'booking.cancelled',
  // Invites — a decision someone is waiting on, with no other home.
  CALL_INVITE_REQUESTED: 'call_invite.requested',
  CALL_INVITE_REJECTED: 'call_invite.rejected',
  CHAT_INVITE_REQUESTED: 'chat_invite.requested',
  CHAT_INVITE_APPROVED: 'chat_invite.approved',
  CHAT_INVITE_REJECTED: 'chat_invite.rejected',
  // Admin campaigns (Phase 5).
  CAMPAIGN: 'campaign',
} as const;

export type NotificationKind = (typeof NotificationKind)[keyof typeof NotificationKind];

export interface NotificationRow {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  body: string | null;
  deeplink: string | null;
  metadata: Record<string, unknown>;
  read_at: Date | null;
  created_at: Date;
}

export interface NotificationView {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  /** Encoded `target?key=value`. The client resolves it via @ohlify/core. */
  deeplink: string | null;
  metadata: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export const BadgeSurface = {
  CALLS: 'calls',
  WALLET: 'wallet',
  CHATS: 'chats',
  NOTIFICATIONS: 'notifications',
} as const;

export type BadgeSurface = (typeof BadgeSurface)[keyof typeof BadgeSurface];

/**
 * Everything the tab bar needs, in one read.
 *
 * Counts where a number is actionable, booleans where "something happened" is
 * the whole signal — a number on Wallet would imply an unread-transaction
 * concept that does not exist.
 */
export interface BadgesView {
  chats_unread: number;
  notifications_unread: number;
  calls_unseen: boolean;
  wallet_unseen: boolean;
}
