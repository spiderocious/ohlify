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
export { idempotencyKey } from './ids/idempotency-key.js';
export { maskAccountNumber } from './helpers/mask-account-number.js';
