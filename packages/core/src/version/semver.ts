/**
 * Minimal semver comparison for app-version gating.
 *
 * Deliberately not a dependency: the only question ever asked is "is the
 * installed build older than the minimum we accept?", and app stores hand us
 * plain `major.minor.patch` strings. Pre-release and build metadata are
 * tolerated but ignored — a build labelled `1.2.0-beta.3` is treated as `1.2.0`,
 * because refusing to parse it would gate a tester out of the app entirely.
 */

export interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
}

/** Returns null for anything unparseable, so callers can fail OPEN rather than lock users out. */
export function parseVersion(raw: string): ParsedVersion | null {
  const core = raw.trim().split(/[-+]/)[0];
  if (!core) return null;

  const parts = core.split('.');
  if (parts.length === 0 || parts.length > 3) return null;

  const numbers = parts.map((p) => (/^\d+$/.test(p) ? Number(p) : Number.NaN));
  if (numbers.some(Number.isNaN)) return null;

  return {
    major: numbers[0] ?? 0,
    minor: numbers[1] ?? 0,
    patch: numbers[2] ?? 0,
  };
}

/** -1 if a < b, 0 if equal, 1 if a > b. */
export function compareVersions(a: ParsedVersion, b: ParsedVersion): number {
  if (a.major !== b.major) return a.major < b.major ? -1 : 1;
  if (a.minor !== b.minor) return a.minor < b.minor ? -1 : 1;
  if (a.patch !== b.patch) return a.patch < b.patch ? -1 : 1;
  return 0;
}

/**
 * Is `installed` older than `minimum`?
 *
 * **Returns false when either version is unparseable.** Gating on a version we
 * cannot read would brick every client sending an unexpected string — the one
 * failure this whole feature must never cause.
 */
export function isOlderThan(installed: string, minimum: string): boolean {
  const a = parseVersion(installed);
  const b = parseVersion(minimum);
  if (!a || !b) return false;
  return compareVersions(a, b) < 0;
}
