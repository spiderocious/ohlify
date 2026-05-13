import type { Request } from 'express';

/**
 * Pulls the connection metadata Express controllers thread through to
 * the auth service when minting / revoking sessions. `ip` is whatever
 * Express resolved after the `trust proxy` setting (real client IP when
 * the proxy chain is honest) and `userAgent` is the raw header.
 *
 * Lives in `lib/http` rather than per-feature so that any controller
 * that re-mints tokens (auth login/refresh, onboarding role-flip, future
 * SSO callbacks) can drop in without copying the same four lines.
 */
export const requestMeta = (req: Request): { ip?: string; userAgent?: string } => ({
  ...(req.ip !== undefined ? { ip: req.ip } : {}),
  ...(req.headers['user-agent'] !== undefined ? { userAgent: req.headers['user-agent'] } : {}),
});
