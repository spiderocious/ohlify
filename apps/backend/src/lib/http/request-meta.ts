import type { Request } from 'express';

/** Structured client telemetry, sent as a `device` object on auth request bodies. */
export interface RequestDeviceInfo {
  platform?: string;
  appVersion?: string;
  deviceName?: string;
  deviceModel?: string;
  osVersion?: string;
}

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
  device?: RequestDeviceInfo;
}

const ALLOWED_PLATFORMS = new Set(['ios', 'android', 'web']);

const text = (value: unknown, maxLength = 128): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value.slice(0, maxLength) : undefined;

/**
 * Reads the optional `device` object off an auth request body.
 *
 * Every field is best-effort and independently optional: telemetry is a
 * nice-to-have, and a malformed or absent block must never be the reason a
 * login fails. Values are length-capped and the platform is checked against a
 * known set, so a hostile client cannot use these columns as free storage.
 */
const deviceFrom = (req: Request): RequestDeviceInfo | undefined => {
  const raw = (req.body as { device?: unknown } | undefined)?.device;
  if (typeof raw !== 'object' || raw === null) return undefined;

  const source = raw as Record<string, unknown>;
  const platform = text(source['platform'], 16);
  const appVersion = text(source['app_version'], 32);
  const deviceName = text(source['device_name']);
  const deviceModel = text(source['device_model']);
  const osVersion = text(source['os_version'], 32);

  const device: RequestDeviceInfo = {
    ...(platform !== undefined && ALLOWED_PLATFORMS.has(platform) ? { platform } : {}),
    ...(appVersion !== undefined ? { appVersion } : {}),
    ...(deviceName !== undefined ? { deviceName } : {}),
    ...(deviceModel !== undefined ? { deviceModel } : {}),
    ...(osVersion !== undefined ? { osVersion } : {}),
  };

  return Object.keys(device).length > 0 ? device : undefined;
};

/**
 * Pulls the connection metadata Express controllers thread through to the auth
 * service when minting / revoking sessions. `ip` is whatever Express resolved
 * after the `trust proxy` setting and `userAgent` is the raw header.
 *
 * Lives in `lib/http` rather than per-feature so that any controller that
 * re-mints tokens (auth login/refresh, onboarding role-flip, future SSO
 * callbacks) records the same telemetry without copying the extraction.
 */
export const requestMeta = (req: Request): RequestMeta => {
  const device = deviceFrom(req);
  return {
    ...(req.ip !== undefined ? { ip: req.ip } : {}),
    ...(req.headers['user-agent'] !== undefined ? { userAgent: req.headers['user-agent'] } : {}),
    ...(device !== undefined ? { device } : {}),
  };
};
