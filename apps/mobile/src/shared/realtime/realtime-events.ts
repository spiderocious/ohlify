/**
 * Realtime event vocabulary. Mirrors `apps/backend/src/lib/realtime/events.ts`
 * — a wire contract, so the two must agree.
 *
 * Events are HINTS, never payload. Each one maps to query keys the client
 * invalidates and refetches from the API that actually owns the data. A dropped
 * event therefore costs a delayed refresh, not a wrong number on screen.
 */
export const RealtimeEvent = {
  SYNC: 'sync',
  WALLET_CHANGED: 'wallet.changed',
  MINUTES_CHANGED: 'minutes.changed',
  CHAT_MESSAGE: 'chat.message',
  CHAT_READ: 'chat.read',
  CALL_INCOMING: 'call.incoming',
  CALL_CANCELLED: 'call.cancelled',
  CALL_ENDED: 'call.ended',
  NOTIFICATION_NEW: 'notification.new',
  BADGES_CHANGED: 'badges.changed',
  AVAILABILITY_CHANGED: 'availability.changed',
  // Multi-party invites. These carry ids the call screen acts on directly, so
  // they invalidate nothing on their own — the roster is refetched by the
  // screen that is actually in the call.
  CALL_INVITE_REQUESTED: 'call.invite.requested',
  CALL_INVITE_RESOLVED: 'call.invite.resolved',
  CALL_PARTICIPANTS_CHANGED: 'call.participants.changed',
} as const;

export type RealtimeEvent = (typeof RealtimeEvent)[keyof typeof RealtimeEvent];

export const REALTIME_EVENT_NAMES = Object.values(RealtimeEvent);

/**
 * Which cached queries each hint invalidates.
 *
 * Prefix keys, so `['chat']` catches every conversation and thread query
 * without this table having to know how they are shaped. Badges appear on most
 * rows because nearly anything worth signalling also moves the tab bar.
 */
export const INVALIDATION_MAP: Record<RealtimeEvent, readonly (readonly string[])[]> = {
  [RealtimeEvent.SYNC]: [],
  [RealtimeEvent.WALLET_CHANGED]: [['wallet'], ['wallet-transactions'], ['badges']],
  [RealtimeEvent.MINUTES_CHANGED]: [['minutes'], ['badges']],
  [RealtimeEvent.CHAT_MESSAGE]: [['chat'], ['badges']],
  [RealtimeEvent.CHAT_READ]: [['chat'], ['badges']],
  [RealtimeEvent.CALL_INCOMING]: [['calls'], ['badges']],
  [RealtimeEvent.CALL_CANCELLED]: [['calls'], ['badges']],
  [RealtimeEvent.CALL_ENDED]: [['calls'], ['wallet'], ['minutes'], ['badges']],
  [RealtimeEvent.NOTIFICATION_NEW]: [['notifications'], ['badges']],
  [RealtimeEvent.BADGES_CHANGED]: [['badges']],
  [RealtimeEvent.AVAILABILITY_CHANGED]: [['me'], ['professionals']],
  [RealtimeEvent.CALL_INVITE_REQUESTED]: [],
  [RealtimeEvent.CALL_INVITE_RESOLVED]: [],
  [RealtimeEvent.CALL_PARTICIPANTS_CHANGED]: [],
};
