// Routing
export { route } from './constants/route.js';
export type { RouteNode } from './constants/route.js';
export { ROUTES } from './constants/routes.js';

// Auth / token storage
export { createTokenStorage, TOKEN_KEYS } from './auth/token-storage.js';
export type { TokenStorage } from './auth/token-storage.js';

// Domain types — mirror mobile/lib/shared/types/.
export * from './types/index.js';

// Mocks — verbatim port of mobile/lib/shared/services/mock_service.dart fixtures.
export * from './mocks/index.js';

// Helpers
export { formatNaira, parseNairaToKobo } from './money/format-naira.js';
export type { FormatNairaOptions } from './money/format-naira.js';
export { formatRelative } from './time/format-relative.js';
export {
  formatSecondsAsClock,
  formatSecondsAsDuration,
  koboForSeconds,
  secondsForKobo,
} from './time/format-duration.js';
// Purchase intents — declare a condition, let a flow satisfy it, let the
// server confirm it.
export {
  IntentNeed,
  IntentStatus,
  IntentStep,
  TERMINAL_INTENT_STATUSES,
} from './intents/intent-types.js';
export type {
  CallChannel,
  IntentRequirement,
  IntentView,
  MinutesRequirement,
  WalletBalanceRequirement,
} from './intents/intent-types.js';
export {
  fundingShortfallKobo,
  previewPurchase,
  resolveStep,
  shortfallCostKobo,
} from './intents/intent-machine.js';
export type { IntentContext } from './intents/intent-machine.js';

// Deeplinks — the stable target vocabulary notifications, banners, and push
// all point at. Stored server-side, so tokens outlive any app build.
export { DeeplinkTarget, decodeDeeplink, encodeDeeplink } from './deeplinks/deeplink.js';
export type { Deeplink } from './deeplinks/deeplink.js';

export { compareVersions, isOlderThan, parseVersion } from './version/semver.js';
export type { ParsedVersion } from './version/semver.js';

export { idempotencyKey } from './ids/idempotency-key.js';
export { maskAccountNumber } from './helpers/mask-account-number.js';
