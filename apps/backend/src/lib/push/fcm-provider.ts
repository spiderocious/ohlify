import { logger } from '@lib/logger.js';

import type { PushNotification, PushProvider, PushSendResult } from './index.js';

interface BuildOptions {
  serviceAccountJsonBase64: string;
  projectId: string;
}

// Narrow types over the firebase-admin surface we actually use. Lets
// us compile this file cleanly even when firebase-admin isn't installed
// — the runtime import either succeeds (real use) or throws (caller
// falls back to the no-op provider).
interface FirebaseAppLike {
  name: string;
}

interface MulticastResponse {
  successCount: number;
  responses: Array<{
    success: boolean;
    error?: { code?: string } | undefined;
  }>;
}

interface FirebaseMessagingLike {
  sendEachForMulticast(message: unknown): Promise<MulticastResponse>;
}

// firebase-admin v14 ships ONLY the modular API. The legacy namespace
// surface this file used to describe — `admin.apps`, `admin.credential`,
// `admin.messaging()` — was removed, and reading it yields `undefined`,
// so `sdk.apps.find(...)` threw `Cannot read properties of undefined`
// and every push silently fell back to the no-op provider.
//
// Two entry points now, matching what v14 actually exports:
//   firebase-admin/app       → initializeApp, getApps, cert
//   firebase-admin/messaging → getMessaging
interface FirebaseAppModuleLike {
  getApps(): ReadonlyArray<FirebaseAppLike>;
  initializeApp(opts: unknown, name?: string): FirebaseAppLike;
  cert(input: { projectId: string; privateKey: string; clientEmail: string }): unknown;
}

interface FirebaseMessagingModuleLike {
  getMessaging(app: FirebaseAppLike): FirebaseMessagingLike;
}

/**
 * Constructs a real FCM-backed push provider using the Firebase Admin
 * SDK. The SDK is imported lazily — installing `firebase-admin` is
 * optional in dev; only environments that want real push need it.
 *
 * Token shapes covered:
 *   - Android (FCM registration tokens)
 *   - iOS (FCM registration tokens — Firebase relays via APNs)
 *   - Web (FCM web tokens, v2)
 *
 * The "Did you install firebase-admin?" message in lib/push/index.ts
 * fires when this import throws because the package isn't installed.
 */
export const buildFcmProvider = async (opts: BuildOptions): Promise<PushProvider> => {
  // Deliberately runtime import via a string variable so TS doesn't
  // statically resolve the module — firebase-admin is an optional dep.
  // The cast is over a narrow surface so we can compile cleanly without
  // the package installed; only environments that actually ship push
  // need to `pnpm add firebase-admin`.
  const appModuleName = 'firebase-admin/app';
  const messagingModuleName = 'firebase-admin/messaging';
  const appModule = (await import(appModuleName)) as unknown as FirebaseAppModuleLike;
  const messagingModule = (await import(
    messagingModuleName
  )) as unknown as FirebaseMessagingModuleLike;

  const serviceAccountJson = JSON.parse(
    Buffer.from(opts.serviceAccountJsonBase64, 'base64').toString('utf8'),
  ) as { project_id: string; private_key: string; client_email: string };

  // Initialize an isolated Firebase app for our project. If multiple
  // services init the default app, this still keeps ours separate.
  const appName = `ohlify-push-${opts.projectId}`;
  const existing = appModule.getApps().find((a) => a?.name === appName);
  const app =
    existing ??
    appModule.initializeApp(
      {
        credential: appModule.cert({
          projectId: serviceAccountJson.project_id,
          privateKey: serviceAccountJson.private_key.replace(/\\n/g, '\n'),
          clientEmail: serviceAccountJson.client_email,
        }),
        projectId: opts.projectId,
      },
      appName,
    );

  const messaging = messagingModule.getMessaging(app);

  return {
    isEnabled: () => true,
    sendToTokens: async (
      tokens: ReadonlyArray<string>,
      notification: PushNotification,
    ): Promise<PushSendResult> => {
      if (tokens.length === 0) return { delivered: 0, invalidTokens: [] };
      // No title AND no body → data-only message: the OS renders nothing;
      // the app's background handler owns the UX (ring UI, dismissals).
      const dataOnly = notification.title === undefined && notification.body === undefined;
      const res = await messaging.sendEachForMulticast({
        tokens: [...tokens],
        // `data` carries the payload the client reads to deep-link or
        // render the ring (call_id, peer info, etc.). FCM requires all
        // values to be strings; `category` rides along for routing.
        data: { ...notification.data, category: notification.category },
        ...(dataOnly
          ? {}
          : { notification: { title: notification.title, body: notification.body } }),
        android: {
          // High priority so call messages wake the device even in Doze.
          priority: 'high',
          ...(dataOnly
            ? {}
            : {
                notification: {
                  channelId: notification.androidChannelId ?? 'default',
                  sound: 'default',
                },
              }),
        },
        apns: dataOnly
          ? {
              // Silent background push — iOS mandates priority 5 and the
              // `background` push type for content-available-only pushes.
              headers: { 'apns-priority': '5', 'apns-push-type': 'background' },
              payload: { aps: { 'content-available': 1 } },
            }
          : {
              headers: { 'apns-priority': '10', 'apns-push-type': 'alert' },
              payload: {
                aps: {
                  alert: { title: notification.title, body: notification.body },
                  sound: 'default',
                },
              },
            },
      });

      const invalidTokens: string[] = [];
      res.responses.forEach((response, idx) => {
        if (response.success) return;
        const errorCode = response.error?.code;
        // FCM marks dead tokens with these codes — prune them.
        if (
          errorCode === 'messaging/registration-token-not-registered' ||
          errorCode === 'messaging/invalid-registration-token' ||
          errorCode === 'messaging/invalid-argument'
        ) {
          const token = tokens[idx];
          if (token !== undefined) invalidTokens.push(token);
        } else {
          logger.warn(
            { errorCode, token: tokens[idx]?.slice(0, 12), category: notification.category },
            'fcm send failed for token (transient)',
          );
        }
      });

      return {
        delivered: res.successCount,
        invalidTokens,
      };
    },
  };
};
