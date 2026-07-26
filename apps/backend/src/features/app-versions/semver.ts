/**
 * Minimal semver comparison for app-version gating.
 *
 * Mirrors `packages/core/src/version/semver.ts` — the backend does not depend
 * on `@ohlify/core`, and the two must agree or a client and the server would
 * disagree about whether an upgrade is required. Change both together.
 */

interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
}

/** Null for anything unparseable, so callers can fail OPEN rather than lock users out. */
export const parseVersion = (raw: string): ParsedVersion | null => {
  const core = raw.trim().split(/[-+]/)[0];
  if (!core) return null;

  const parts = core.split('.');
  if (parts.length === 0 || parts.length > 3) return null;

  const numbers = parts.map((p) => (/^\d+$/.test(p) ? Number(p) : Number.NaN));
  if (numbers.some(Number.isNaN)) return null;

  return { major: numbers[0] ?? 0, minor: numbers[1] ?? 0, patch: numbers[2] ?? 0 };
};

/**
 * Is `installed` older than `minimum`?
 *
 * **False when either version is unparseable.** Gating on a version we cannot
 * read would brick every client sending an unexpected string — the one failure
 * this feature must never cause.
 */
export const isOlderThan = (installed: string, minimum: string): boolean => {
  const a = parseVersion(installed);
  const b = parseVersion(minimum);
  if (!a || !b) return false;
  if (a.major !== b.major) return a.major < b.major;
  if (a.minor !== b.minor) return a.minor < b.minor;
  return a.patch < b.patch;
};
