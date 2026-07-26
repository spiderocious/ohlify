import { Platform } from 'react-native';

import type * as NotifeeNS from '@notifee/react-native';
import type * as MessagingNS from '@react-native-firebase/messaging';
import type { Event as NotifeeEvent } from '@notifee/react-native';
import type { FirebaseMessagingTypes } from '@react-native-firebase/messaging';

import { instantCallsApi } from '@features/instant-calls/api/instant-calls-api';
import { apiClient } from '@shared/api/api-client';
import { tokenService } from '@shared/services/token-service';

import { emitCallSignal } from './call-signals';
import { isConversationFocused } from './focused-conversation';
import { requestPushNavigation } from './push-intents';

/**
 * The single push entrypoint for the app. Everything native (FCM token,
 * notifee channels/notifications, background handlers) lives behind lazy
 * requires — this module is imported unconditionally (including by the web
 * bundle) but only touches native modules on Android/iOS.
 *
 * Message contract (mirrors the backend outbox worker's buildPushNotification):
 *  - call.incoming   data-only  → render the full-screen ring (notifee)
 *  - call.cancelled  data-only  → dismiss the ring + signal live screens
 *  - chat.message    visible    → OS renders in background; we render in
 *                                 foreground unless that thread is focused
 *  - call.missed     visible    → OS renders in background
 * Pushes are wake-up hints only — every action re-validates against the API.
 */

const isNative = Platform.OS === 'android' || Platform.OS === 'ios';

/* eslint-disable @typescript-eslint/no-require-imports -- native modules must not load in the web bundle; requires are gated behind Platform checks. */
type NotifeeModule = typeof NotifeeNS;
type MessagingModule = typeof MessagingNS;

const loadNotifee = (): NotifeeModule => require('@notifee/react-native') as NotifeeModule;
const loadMessaging = (): MessagingModule['default'] =>
  (require('@react-native-firebase/messaging') as MessagingModule).default;
/* eslint-enable @typescript-eslint/no-require-imports */

const CHANNEL_INCOMING_CALLS = 'incoming_calls';
const CHANNEL_CALLS = 'calls';
const CHANNEL_CHAT = 'chat';
const CHANNEL_DEFAULT = 'default';

const FALLBACK_RING_MS = 45_000;

type PushData = Record<string, string>;

const dataOf = (message: FirebaseMessagingTypes.RemoteMessage): PushData => {
  const out: PushData = {};
  for (const [key, value] of Object.entries(message.data ?? {})) {
    if (typeof value === 'string') out[key] = value;
  }
  return out;
};

// ── Channels ──────────────────────────────────────────────────────────────────

const createChannels = async (): Promise<void> => {
  const { default: notifee, AndroidImportance } = loadNotifee();
  await notifee.createChannel({
    id: CHANNEL_INCOMING_CALLS,
    name: 'Incoming calls',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
  });
  await notifee.createChannel({
    id: CHANNEL_CALLS,
    name: 'Calls',
    importance: AndroidImportance.HIGH,
    sound: 'default',
  });
  await notifee.createChannel({
    id: CHANNEL_CHAT,
    name: 'Messages',
    importance: AndroidImportance.HIGH,
    sound: 'default',
  });
  await notifee.createChannel({
    id: CHANNEL_DEFAULT,
    name: 'General',
    importance: AndroidImportance.DEFAULT,
  });
};

// ── Incoming-call ring ────────────────────────────────────────────────────────

const showIncomingCall = async (data: PushData): Promise<void> => {
  const callId = data.call_id;
  if (!callId) return;

  // Stale push (delivered after the ring window) → never show a ghost ring.
  const expiresAtMs = data.ring_expires_at ? Date.parse(data.ring_expires_at) : NaN;
  const timeoutAfter = Number.isNaN(expiresAtMs)
    ? FALLBACK_RING_MS
    : expiresAtMs - Date.now();
  if (timeoutAfter <= 0) return;

  const { default: notifee, AndroidCategory, AndroidImportance } = loadNotifee();
  const callType = data.call_type === 'video' ? 'video' : 'audio';
  await notifee.displayNotification({
    id: callId,
    title: `Incoming ${callType} call`,
    body: data.caller_full_name || 'Ohlify caller',
    data,
    android: {
      channelId: CHANNEL_INCOMING_CALLS,
      category: AndroidCategory.CALL,
      importance: AndroidImportance.HIGH,
      // Locked/idle phone → our activity takes the whole screen; in-use
      // phone → heads-up banner with the actions. Both are OS behavior.
      fullScreenAction: { id: 'default' },
      pressAction: { id: 'open-call', launchActivity: 'default' },
      actions: [
        { title: 'Accept', pressAction: { id: 'accept', launchActivity: 'default' } },
        { title: 'Decline', pressAction: { id: 'decline' } },
      ],
      sound: 'default',
      loopSound: true,
      ongoing: true,
      autoCancel: false,
      lightUpScreen: true,
      timeoutAfter,
      showTimestamp: true,
    },
  });
};

export const dismissIncomingCall = async (callId: string): Promise<void> => {
  if (!isNative || !callId) return;
  const { default: notifee } = loadNotifee();
  await notifee.cancelNotification(callId);
};

const declineIncomingCall = async (callId: string): Promise<void> => {
  await dismissIncomingCall(callId);
  try {
    // Headless (killed-app) contexts never ran the auth provider — load
    // tokens before the API call. init() is idempotent.
    await tokenService.init();
    await instantCallsApi.end(callId, 0);
  } catch {
    // Best-effort: the backend ring-timeout resolver finalizes it anyway.
  }
};

// ── Chat / visible notifications (foreground rendering) ──────────────────────

const showChatMessage = async (
  data: PushData,
  notification: FirebaseMessagingTypes.RemoteMessage['notification'],
): Promise<void> => {
  const conversationId = data.conversation_id;
  if (!conversationId || isConversationFocused(conversationId)) return;
  const { default: notifee, AndroidImportance } = loadNotifee();
  await notifee.displayNotification({
    // One notification per thread — a new message replaces the previous.
    id: `chat_${conversationId}`,
    title: notification?.title ?? data.sender_full_name ?? 'New message',
    body: notification?.body ?? data.preview ?? 'Sent you a message',
    data,
    android: {
      channelId: CHANNEL_CHAT,
      importance: AndroidImportance.HIGH,
      pressAction: { id: 'open-chat', launchActivity: 'default' },
      sound: 'default',
      showTimestamp: true,
    },
  });
};

// ── Message routing ───────────────────────────────────────────────────────────

const handleRemoteMessage = async (
  message: FirebaseMessagingTypes.RemoteMessage,
  context: 'foreground' | 'background',
): Promise<void> => {
  const data = dataOf(message);
  switch (data.type) {
    case 'call.incoming':
      await showIncomingCall(data);
      return;
    case 'call.cancelled':
      await dismissIncomingCall(data.call_id ?? '');
      emitCallSignal({
        type: 'cancelled',
        callId: data.call_id ?? '',
        reason: data.reason ?? 'cancelled',
      });
      return;
    case 'chat.message':
      // Background/killed: the OS already rendered the system notification
      // (these are notification+data messages) — rendering again would
      // duplicate it. Foreground: the OS renders nothing, so we do.
      if (context === 'foreground') await showChatMessage(data, message.notification);
      return;
    default:
      // call.missed / call.joinable and future visible categories: OS
      // renders them in background; in foreground we stay quiet (screens
      // poll) rather than interrupt.
      return;
  }
};

// Notification interactions (both foreground and background/killed).
const handleNotifeeEvent = async (event: NotifeeEvent): Promise<void> => {
  const { EventType } = loadNotifee();
  const data = (event.detail.notification?.data ?? {}) as PushData;
  const pressId = event.detail.pressAction?.id;

  if (event.type === EventType.ACTION_PRESS && pressId === 'decline') {
    await declineIncomingCall(data.call_id ?? '');
    return;
  }

  const isAccept = event.type === EventType.ACTION_PRESS && pressId === 'accept';
  const isOpen = event.type === EventType.PRESS;
  if ((isAccept || isOpen) && data.type === 'call.incoming') {
    requestPushNavigation({
      kind: 'incoming-call',
      callId: data.call_id ?? '',
      callerUserId: data.caller_user_id ?? '',
      callerName: data.caller_full_name || 'Ohlify caller',
      callerAvatarUrl: data.caller_avatar_url || undefined,
      callType: data.call_type === 'video' ? 'video' : 'audio',
      ringExpiresAt: data.ring_expires_at || undefined,
      autoAccept: isAccept,
    });
    return;
  }
  if (isOpen && data.type === 'chat.message' && data.conversation_id) {
    requestPushNavigation({ kind: 'chat', conversationId: data.conversation_id });
  }
};

// Taps on FCM system-tray notifications (chat/missed-call rendered by the
// OS while the app was in background or killed).
const handleOpenedFromTray = (message: FirebaseMessagingTypes.RemoteMessage): void => {
  const data = dataOf(message);
  if (data.type === 'chat.message' && data.conversation_id) {
    requestPushNavigation({ kind: 'chat', conversationId: data.conversation_id });
  }
};

// ── Public wiring ─────────────────────────────────────────────────────────────

/**
 * MUST be called from index.ts before registerRootComponent: background
 * handlers have to exist before React mounts (and in headless wakes React
 * never mounts at all).
 */
export const installBackgroundPushHandlers = (): void => {
  if (!isNative) return;
  const messaging = loadMessaging();
  const { default: notifee } = loadNotifee();
  messaging().setBackgroundMessageHandler((message) =>
    handleRemoteMessage(message, 'background'),
  );
  notifee.onBackgroundEvent(handleNotifeeEvent);
};

let foregroundReady = false;

/** Idempotent. Called once from the App root: channels, foreground listeners, cold-start intents. */
export const initForegroundPush = async (): Promise<void> => {
  if (!isNative || foregroundReady) return;
  foregroundReady = true;

  const messaging = loadMessaging();
  const { default: notifee } = loadNotifee();

  await createChannels();

  messaging().onMessage((message) => handleRemoteMessage(message, 'foreground'));
  notifee.onForegroundEvent((event) => {
    void handleNotifeeEvent(event);
  });
  messaging().onNotificationOpenedApp(handleOpenedFromTray);

  // Cold starts from a notification tap: FCM tray taps and notifee
  // (ring UI) taps surface through two different APIs.
  const initialRemote = await messaging().getInitialNotification();
  if (initialRemote) handleOpenedFromTray(initialRemote);
  const initialNotifee = await notifee.getInitialNotification();
  if (initialNotifee) {
    const { EventType } = loadNotifee();
    await handleNotifeeEvent({
      type: EventType.ACTION_PRESS,
      detail: {
        notification: initialNotifee.notification,
        pressAction: initialNotifee.pressAction,
      },
    });
  }
};

/**
 * Ask for notification permission (Android 13+ prompt; no-op earlier) and
 * register this device's FCM token with the backend. Called on every
 * login/session-restore — the upsert is idempotent and bumps last_seen_at.
 */
export const registerDeviceTokenWithBackend = async (): Promise<void> => {
  if (!isNative) return;
  try {
    const { default: notifee } = loadNotifee();
    await notifee.requestPermission();
    const messaging = loadMessaging();
    const token = await messaging().getToken();
    if (!token) return;
    await apiClient.post(
      'me/device-tokens',
      { token, platform: Platform.OS },
      { fromJson: () => undefined },
    );
    // FCM rotates tokens occasionally — keep the backend current.
    messaging().onTokenRefresh((fresh) => {
      void apiClient
        .post('me/device-tokens', { token: fresh, platform: Platform.OS }, { fromJson: () => undefined })
        .catch(() => undefined);
    });
  } catch {
    // Permission denied or transient failure — calls still work in-app via
    // the foreground poll; we re-attempt on the next login/restore.
  }
};

/** Remove this device's token on logout so a signed-out phone stops ringing. */
export const unregisterDeviceToken = async (): Promise<void> => {
  if (!isNative) return;
  try {
    const messaging = loadMessaging();
    const token = await messaging().getToken();
    if (!token) return;
    await apiClient.delete('me/device-tokens', { body: { token }, fromJson: () => undefined });
  } catch {
    // Best-effort: the backend prunes dead tokens on the next failed send.
  }
};
