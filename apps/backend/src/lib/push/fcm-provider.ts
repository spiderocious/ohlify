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

interface FirebaseAdminLike {
  apps: ReadonlyArray<FirebaseAppLike | null>;
  credential: {
    cert(input: { projectId: string; privateKey: string; clientEmail: string }): unknown;
  };
  initializeApp(opts: unknown, name?: string): FirebaseAppLike;
  messaging(app: FirebaseAppLike): FirebaseMessagingLike;
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
  const moduleName = 'firebase-admin';
  const admin = (await import(moduleName)) as unknown as
    | FirebaseAdminLike
    | { default: FirebaseAdminLike };
  const sdk: FirebaseAdminLike = 'default' in admin ? admin.default : admin;

  const serviceAccountJson = JSON.parse(
    Buffer.from(opts.serviceAccountJsonBase64, 'base64').toString('utf8'),
  ) as { project_id: string; private_key: string; client_email: string };

  // Initialize an isolated Firebase app for our project. If multiple
  // services init the default app, this still keeps ours separate.
  const appName = `ohlify-push-${opts.projectId}`;
  const existing = sdk.apps.find((a): a is FirebaseAppLike => a?.name === appName);
  const app =
    existing ??
    sdk.initializeApp(
      {
        credential: sdk.credential.cert({
          projectId: serviceAccountJson.project_id,
          privateKey: serviceAccountJson.private_key.replace(/\\n/g, '\n'),
          clientEmail: serviceAccountJson.client_email,
        }),
        projectId: opts.projectId,
      },
      appName,
    );

  const messaging = sdk.messaging(app);

  return {
    isEnabled: () => true,
    sendToTokens: async (
      tokens: ReadonlyArray<string>,
      notification: PushNotification,
    ): Promise<PushSendResult> => {
      if (tokens.length === 0) return { delivered: 0, invalidTokens: [] };
      const res = await messaging.sendEachForMulticast({
        tokens: [...tokens],
        // Notification is the visible part; `data` carries the payload
        // the client reads to deep-link (call_id, peer info, etc.).
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: notification.data,
        android: {
          // High priority so call notifications wake the device.
          priority: 'high',
          notification: {
            channelId: 'calls',
            // CallKit-equivalent on Android needs `flutter_callkit_incoming`;
            // we just deliver the data payload — the app constructs the UI.
          },
        },
        apns: {
          headers: {
            'apns-priority': '10',
            // VoIP push interruption — the client deals with CallKit.
            'apns-push-type': 'alert',
          },
          payload: {
            aps: {
              alert: { title: notification.title, body: notification.body },
              sound: 'default',
              'content-available': 1,
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
