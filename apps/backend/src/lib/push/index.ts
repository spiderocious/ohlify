import { env } from '../../env.js';
import { logger } from '@lib/logger.js';

/**
 * Push provider contract.
 *
 * The outbox push handler reads device tokens for a user and calls
 * [sendToTokens] once per event. The provider is responsible for fan-out
 * to its underlying transport (FCM Admin SDK for now; could be APNs
 * direct, OneSignal, etc.).
 *
 * The return shape MUST list invalid tokens so the caller can prune
 * them. FCM returns `messaging/registration-token-not-registered` for
 * uninstalled apps + rotated tokens; we surface that as `invalidTokens`.
 */
export interface PushNotification {
  /** Short headline (~40 chars). e.g. "Your call is ready." */
  title: string;
  /** One-line body (~120 chars). e.g. "Adedeji is waiting in the room." */
  body: string;
  /**
   * Structured payload the client reads to deep-link / show CallKit. The
   * provider serializes this into FCM's `data` field on Android and
   * `aps` + custom keys on iOS.
   */
  data: Record<string, string>;
  /**
   * Category — drives client routing. `call.joinable` triggers the
   * incoming-call UI; future categories: `call.cancelled`,
   * `booking.confirmed`, etc.
   */
  category: string;
}

export interface PushSendResult {
  /** Number of tokens that accepted the message. */
  delivered: number;
  /**
   * Tokens the provider rejected as no-longer-registered (uninstall,
   * rotation, etc.). The caller should DELETE these rows from
   * device_tokens.
   */
  invalidTokens: string[];
}

export interface PushProvider {
  /** True iff this provider can actually deliver. Outbox can skip work otherwise. */
  isEnabled(): boolean;
  sendToTokens(
    tokens: ReadonlyArray<string>,
    notification: PushNotification,
  ): Promise<PushSendResult>;
}

/**
 * No-op fallback. When FCM creds aren't set, every send logs at warn
 * level and returns delivered=0. Lets the rest of the system run
 * unmodified in dev / before the Firebase project lands.
 */
const noopProvider: PushProvider = {
  isEnabled: () => false,
  sendToTokens: (tokens, n) => {
    logger.warn(
      {
        push_disabled: true,
        tokens: tokens.length,
        category: n.category,
        title: n.title,
      },
      'push provider disabled — set FCM_SERVICE_ACCOUNT_JSON_BASE64 to enable',
    );
    return Promise.resolve({ delivered: 0, invalidTokens: [] });
  },
};

let cachedProvider: PushProvider | null = null;

/**
 * Lazy-construct the provider on first use so we don't crash module
 * load when `firebase-admin` isn't installed yet. Production deploys
 * that want push must `pnpm add firebase-admin` and set both
 * FCM_SERVICE_ACCOUNT_JSON_BASE64 and FCM_PROJECT_ID.
 */
export const getPushProvider = async (): Promise<PushProvider> => {
  if (cachedProvider !== null) return cachedProvider;
  if (env.FCM_SERVICE_ACCOUNT_JSON_BASE64 === undefined || env.FCM_PROJECT_ID === undefined) {
    cachedProvider = noopProvider;
    return cachedProvider;
  }
  try {
    const m = await import('./fcm-provider.js');
    cachedProvider = await m.buildFcmProvider({
      serviceAccountJsonBase64: env.FCM_SERVICE_ACCOUNT_JSON_BASE64,
      projectId: env.FCM_PROJECT_ID,
    });
  } catch (err) {
    logger.error(
      { err },
      'failed to construct FCM provider — falling back to no-op. Did you install firebase-admin?',
    );
    cachedProvider = noopProvider;
  }
  return cachedProvider;
};

/** For tests — bypass env-driven construction. */
export const setPushProviderForTesting = (provider: PushProvider | null): void => {
  cachedProvider = provider;
};
