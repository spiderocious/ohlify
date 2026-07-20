import type { CallType } from '@ohlify/core';

/**
 * Mirrors mobile/lib/features/calls/types/call_models.dart. Backend
 * denormalises peer display fields (`peer_user_id`/`peer_name`/
 * `peer_avatar_url`) onto each row relative to the viewer, so the UI never
 * needs to know who "me" is.
 */
export interface CallHistoryItem {
  id: string;
  bookingId: string;
  callerUserId: string;
  calleeUserId: string;
  callType: CallType;
  startAt: string;
  durationMinutes: number;
  bookingStatus: string;
  callStatus: string;
  peerUserId: string;
  peerName?: string;
  peerAvatarKey?: string;
  endAt?: string;
  connectedSeconds?: number;
  priceKobo?: number;
}

const TERMINAL_CALL_STATUSES = new Set([
  'completed',
  'no_show_caller',
  'no_show_callee',
  'no_show_both',
  'disconnected_caller',
  'disconnected_callee',
]);

export type CallTab = 'scheduled' | 'completed';

export function callTabOf(c: CallHistoryItem): CallTab {
  const isScheduled = c.bookingStatus === 'confirmed' && !TERMINAL_CALL_STATUSES.has(c.callStatus);
  return isScheduled ? 'scheduled' : 'completed';
}

export function callStateLabel(c: CallHistoryItem): string {
  if (c.bookingStatus.startsWith('cancelled_')) return 'Cancelled';
  if (c.callStatus === 'completed') return 'Completed';
  if (c.bookingStatus === 'fulfilled') return 'Completed';
  if (c.callStatus === 'in_progress') return 'In progress';
  if (c.callStatus.startsWith('no_show_')) return 'Missed';
  if (c.callStatus.startsWith('disconnected_')) return 'Disconnected';
  return 'Pending';
}

export function callHistoryItemFromJson(json: Record<string, unknown>): CallHistoryItem {
  const durSec = json.connected_seconds;
  const priceRaw = json.total_paid_kobo ?? json.price_kobo;
  return {
    id: ((json.call_id ?? json.id) as string) ?? '',
    bookingId: (json.booking_id as string) ?? '',
    callerUserId: (json.caller_user_id as string) ?? '',
    calleeUserId: (json.callee_user_id as string) ?? '',
    callType: ((json.call_type as string) ?? 'audio') as CallType,
    startAt: ((json.start_at ?? json.created_at) as string) ?? new Date().toISOString(),
    durationMinutes: typeof json.duration_minutes === 'number' ? json.duration_minutes : 0,
    bookingStatus: (json.booking_status as string) ?? 'confirmed',
    callStatus: (json.call_status as string) ?? 'scheduled',
    peerUserId: (json.peer_user_id as string) ?? '',
    peerName: json.peer_name as string | undefined,
    peerAvatarKey: json.peer_avatar_url as string | undefined,
    endAt: (json.ended_at ?? json.end_at) as string | undefined,
    connectedSeconds: typeof durSec === 'number' ? durSec : undefined,
    priceKobo: typeof priceRaw === 'number' ? priceRaw : undefined,
  };
}

export interface JoinCallResponse {
  callId: string;
  appId: string;
  channel: string;
  uid: number;
  agoraToken: string;
  expiresAt: string;
}

export function joinCallResponseFromJson(json: Record<string, unknown>): JoinCallResponse {
  return {
    callId: (json.call_id as string) ?? '',
    appId: ((json.agora_app_id ?? json.app_id) as string) ?? '',
    channel: ((json.agora_channel_name ?? json.channel) as string) ?? '',
    uid: typeof (json.agora_uid ?? json.uid) === 'number' ? ((json.agora_uid ?? json.uid) as number) : 0,
    agoraToken: (json.agora_token as string) ?? '',
    expiresAt: (json.expires_at as string) ?? new Date(Date.now() + 3_600_000).toISOString(),
  };
}

export interface RenewTokenResponse {
  agoraToken: string;
  expiresAt: string;
}

export function renewTokenResponseFromJson(json: Record<string, unknown>): RenewTokenResponse {
  return {
    agoraToken: (json.agora_token as string) ?? '',
    expiresAt: (json.expires_at as string) ?? new Date(Date.now() + 3_600_000).toISOString(),
  };
}

export interface CursorPage<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
}
