/**
 * Segment predicates, compiled to SQL against one user.
 *
 * Evaluated at READ time rather than baked in when a banner is authored. That
 * is what makes "users younger than 7 days" mean what it says — someone ages
 * out of it on their eighth day without anyone touching the banner — and it is
 * why there is no rule excluding banners created before a user registered: a
 * signup-bonus banner is *specifically* for people who just joined.
 *
 * Every field is `| undefined` as well as optional: Zod's output type includes
 * explicit `undefined` for optional keys, and under `exactOptionalPropertyTypes`
 * a plain `?` would reject it.
 */
export interface SegmentPredicate {
  role?: string | undefined;
  kyc_status?: string | undefined;
  /** Any of these platforms, from the user's most recent session. */
  platform?: string[] | undefined;
  /** Registered less than this many days ago. */
  account_age_max_days?: number | undefined;
  /** Registered at least this many days ago. */
  account_age_min_days?: number | undefined;
  /** Spendable wallet balance at or above this, in kobo. */
  min_balance_kobo?: number | undefined;
  /** Spendable wallet balance at or below this, in kobo. */
  max_balance_kobo?: number | undefined;
  /** Installed build older than this (simple 3-part comparison). */
  app_version_below?: string | undefined;
}

export interface CompiledSegment {
  /** SQL fragment referencing `u` (users). Empty predicate → 'TRUE'. */
  sql: string;
  params: unknown[];
}

/** `1.4.2` → 10040002, so a plain integer comparison orders versions correctly. */
const versionRank = (raw: string): number | null => {
  const parts = raw.trim().split('.');
  if (parts.length === 0 || parts.length > 3) return null;
  const nums = parts.map((p) => (/^\d+$/.test(p) ? Number(p) : Number.NaN));
  if (nums.some(Number.isNaN)) return null;
  return (nums[0] ?? 0) * 1_000_000 + (nums[1] ?? 0) * 1_000 + (nums[2] ?? 0);
};

/**
 * Builds the WHERE fragment for a segment.
 *
 * `nextParam` is the 1-based index the caller's parameter list has already
 * reached, so several segments can be compiled into one query without their
 * placeholders colliding.
 *
 * An unrecognised key is ignored rather than rejected: a predicate written by a
 * newer admin build should narrow a banner's audience if this server
 * understands it, and simply not narrow it if not — never crash the read path
 * every screen depends on.
 */
export const compileSegment = (predicate: SegmentPredicate, nextParam: number): CompiledSegment => {
  const clauses: string[] = [];
  const params: unknown[] = [];
  const p = (): string => `$${nextParam + params.length}`;

  if (predicate.role) {
    clauses.push(`u.role::text = ${p()}`);
    params.push(predicate.role);
  }
  if (predicate.kyc_status) {
    clauses.push(`u.kyc_status::text = ${p()}`);
    params.push(predicate.kyc_status);
  }
  if (predicate.account_age_max_days !== undefined) {
    clauses.push(`u.created_at > now() - (${p()} * INTERVAL '1 day')`);
    params.push(predicate.account_age_max_days);
  }
  if (predicate.account_age_min_days !== undefined) {
    clauses.push(`u.created_at <= now() - (${p()} * INTERVAL '1 day')`);
    params.push(predicate.account_age_min_days);
  }

  // Platform comes from the newest live session — device_tokens can hold a
  // stale entry from a phone the user no longer carries.
  if (predicate.platform && predicate.platform.length > 0) {
    clauses.push(`EXISTS (
      SELECT 1 FROM auth_sessions s
       WHERE s.user_id = u.id AND s.revoked_at IS NULL
         AND s.platform = ANY(${p()}::text[])
    )`);
    params.push(predicate.platform);
  }

  const versionCeiling =
    predicate.app_version_below !== undefined ? versionRank(predicate.app_version_below) : null;
  if (versionCeiling !== null) {
    // Ranks the dotted version in SQL so "below 1.4.0" is a numeric compare
    // rather than a string one, where '1.10.0' would sort under '1.4.0'.
    clauses.push(`EXISTS (
      SELECT 1 FROM auth_sessions s
       WHERE s.user_id = u.id AND s.revoked_at IS NULL AND s.app_version IS NOT NULL
         AND (
           COALESCE(NULLIF(split_part(s.app_version, '.', 1), ''), '0')::int * 1000000
         + COALESCE(NULLIF(split_part(s.app_version, '.', 2), ''), '0')::int * 1000
         + COALESCE(NULLIF(split_part(s.app_version, '.', 3), ''), '0')::int
         ) < ${p()}
    )`);
    params.push(versionCeiling);
  }

  if (predicate.min_balance_kobo !== undefined) {
    clauses.push(`COALESCE((
      SELECT ab.balance_kobo FROM accounts a
        JOIN account_balances ab ON ab.account_id = a.id
       WHERE a.owner_user_id = u.id AND a.kind = 'user' LIMIT 1), 0) >= ${p()}`);
    params.push(predicate.min_balance_kobo);
  }
  if (predicate.max_balance_kobo !== undefined) {
    clauses.push(`COALESCE((
      SELECT ab.balance_kobo FROM accounts a
        JOIN account_balances ab ON ab.account_id = a.id
       WHERE a.owner_user_id = u.id AND a.kind = 'user' LIMIT 1), 0) <= ${p()}`);
    params.push(predicate.max_balance_kobo);
  }

  // An empty predicate targets everyone — the same as `kind = 'all'`.
  return { sql: clauses.length > 0 ? clauses.join(' AND ') : 'TRUE', params };
};
