/**
 * @ohlify/api — placeholder.
 *
 * v1 web ships against mocks (see @ohlify/core/mocks). This package is wired
 * into the workspace so apps can `import {} from '@ohlify/api'` without errors;
 * the actual hooks land when we wire real backend endpoints.
 */
export const API_VERSION = 'v1' as const;
