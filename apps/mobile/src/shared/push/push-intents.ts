import { navigationRef } from '@shared/navigation/navigation-ref';

/**
 * A navigation request produced by a push interaction (tapping a chat
 * notification, accepting an incoming call). Intents are queued until the
 * app is actually able to navigate: nav container ready, session restored,
 * and past the Splash/Auth gate — a cold start from a notification tap
 * arrives long before any of that is true.
 */
export type PushIntent =
  | {
      kind: 'incoming-call';
      callId: string;
      callerUserId: string;
      callerName: string;
      callerAvatarUrl?: string;
      callType: 'audio' | 'video';
      ringExpiresAt?: string;
      /** True when the user pressed the notification's Accept action — skip the ring screen's buttons and answer immediately. */
      autoAccept: boolean;
    }
  | { kind: 'chat'; conversationId: string };

/** Routes an intent must never fire on — navigation there gets replaced by the auth/splash flow moments later. */
const GATED_ROUTES = ['Splash', 'Onboarding', 'Auth', 'RoleSelection'];

let pendingIntent: PushIntent | null = null;
let sessionReady = false;

const flush = (): void => {
  if (pendingIntent === null || !sessionReady || !navigationRef.isReady()) return;
  const routeName = navigationRef.getCurrentRoute()?.name;
  if (routeName === undefined || GATED_ROUTES.includes(routeName)) return;

  const intent = pendingIntent;
  pendingIntent = null;
  if (intent.kind === 'incoming-call') {
    navigationRef.navigate('IncomingCall', {
      callId: intent.callId,
      callerUserId: intent.callerUserId,
      callerName: intent.callerName,
      callerAvatarUrl: intent.callerAvatarUrl,
      callType: intent.callType,
      ringExpiresAt: intent.ringExpiresAt,
      autoAccept: intent.autoAccept,
    });
  } else {
    navigationRef.navigate('ChatThread', { conversationId: intent.conversationId });
  }
};

/** Queue (or immediately perform) navigation for a push interaction. */
export const requestPushNavigation = (intent: PushIntent): void => {
  pendingIntent = intent;
  flush();
};

/** Called whenever auth state changes — intents only flush for a signed-in, restored session. */
export const setPushSessionReady = (ready: boolean): void => {
  sessionReady = ready;
  flush();
};

/** Called by the NavigationContainer on ready + every state change. */
export const flushPushIntent = (): void => {
  flush();
};
