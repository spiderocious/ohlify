/**
 * Realtime event vocabulary.
 *
 * **SSE carries signals. FCM carries reach. Postgres carries truth.**
 *
 * An event is a HINT — "your wallet changed" — never the payload itself. The
 * client responds by invalidating a query key and refetching from the API that
 * already owns that data. That rule is what makes a dropped event harmless: it
 * costs a delayed refresh, not a wrong balance. Put a number in here and every
 * disconnect becomes a correctness bug.
 */
export const RealtimeEvent = {
  /**
   * Sent once on (re)connect. Tells the client to invalidate everything rather
   * than replay a backlog — after twenty minutes offline, forty queued events
   * are both expensive and pointless.
   */
  SYNC: 'sync',
  WALLET_CHANGED: 'wallet.changed',
  MINUTES_CHANGED: 'minutes.changed',
  CHAT_MESSAGE: 'chat.message',
  CHAT_READ: 'chat.read',
  // Group chat: the professional is asked, then both the inviter and the
  // invitee learn the outcome.
  CHAT_INVITE_REQUESTED: 'chat.invite.requested',
  CHAT_INVITE_RESOLVED: 'chat.invite.resolved',
  CHAT_PARTICIPANTS_CHANGED: 'chat.participants.changed',
  CALL_INCOMING: 'call.incoming',
  CALL_CANCELLED: 'call.cancelled',
  CALL_ENDED: 'call.ended',
  /**
   * Multi-party invites. Approval is delivered over SSE to the parent shell,
   * NOT over the call-app datachannel — the datachannel would be faster, but it
   * makes authorization a client-side claim. Access to a paid room stays
   * server-authoritative.
   */
  CALL_INVITE_REQUESTED: 'call.invite.requested',
  CALL_INVITE_RESOLVED: 'call.invite.resolved',
  CALL_PARTICIPANTS_CHANGED: 'call.participants.changed',
  NOTIFICATION_NEW: 'notification.new',
  BADGES_CHANGED: 'badges.changed',
  AVAILABILITY_CHANGED: 'availability.changed',
} as const;

export type RealtimeEvent = (typeof RealtimeEvent)[keyof typeof RealtimeEvent];

export interface RealtimeMessage {
  type: RealtimeEvent;
  /**
   * Identifiers only — enough to route or scope an invalidation (which
   * conversation, which call). Never the content itself.
   */
  data?: Record<string, string>;
}
