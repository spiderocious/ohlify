import { pool } from '@lib/db/pool.js';

import { compileSegment, type SegmentPredicate } from './banner-segments.js';
import type { BannerRow } from './banners.repo.js';

/**
 * Target tiers, most specific first.
 *
 * A banner aimed at me personally beats one aimed at a group I happen to be in,
 * which beats one aimed at everyone. Encoding the order here rather than in a
 * SQL `CASE` keeps it readable and testable.
 */
const TIER_RANK: Record<string, number> = { user: 0, segment: 1, all: 2 };

interface CandidateRow extends BannerRow {
  target_kind: string;
  /** Shape depends on `target_kind`; only segments carry a predicate. */
  target_payload: SegmentPredicate & { user_ids?: string[] };
  already_seen: boolean;
}

/**
 * The single banner to show a user on one screen.
 *
 * One per screen — no stacking, so there is no layout ambiguity and no question
 * of which one wins at render time.
 *
 * A `view_once` banner the user has already seen **falls through to the next
 * tier** rather than blanking the slot: otherwise a single seen banner would
 * permanently empty that screen for that user.
 *
 * Eligibility is checked live on every read, so a banner whose window closed,
 * or whose segment the user has aged out of, simply stops appearing. Nothing
 * needs to expire it.
 */
export const resolveBannerForUser = async (
  userId: string,
  placement: string,
): Promise<BannerRow | null> => {
  // Everything live for this placement, with its targets. The set is small —
  // a handful of banners per screen — so filtering segments in application code
  // keeps the SQL comprehensible and the predicate logic in one place.
  const res = await pool.query<CandidateRow>(
    `SELECT b.*,
            t.kind::text                      AS target_kind,
            t.payload                         AS target_payload,
            (v.user_id IS NOT NULL)           AS already_seen
       FROM banners b
       JOIN banner_targets t ON t.banner_id = b.id
       LEFT JOIN banner_views v ON v.banner_id = b.id AND v.user_id = $1
      WHERE b.is_active = TRUE
        AND b.placement = $2::banner_placement
        AND (b.starts_at IS NULL OR b.starts_at <= now())
        AND b.ends_at > now()
      ORDER BY b.priority DESC, b.created_at DESC`,
    [userId, placement],
  );

  const candidates = res.rows
    // A view-once banner already shown is out of the running entirely, so the
    // next tier gets its turn.
    .filter((row) => !(row.view_once && row.already_seen))
    .sort((a, b) => {
      const tier = (TIER_RANK[a.target_kind] ?? 9) - (TIER_RANK[b.target_kind] ?? 9);
      if (tier !== 0) return tier;
      if (a.priority !== b.priority) return b.priority - a.priority;
      return b.created_at.getTime() - a.created_at.getTime();
    });

  for (const candidate of candidates) {
    if (await matchesTarget(userId, candidate)) return candidate;
  }
  return null;
};

const matchesTarget = async (userId: string, candidate: CandidateRow): Promise<boolean> => {
  if (candidate.target_kind === 'all') return true;

  if (candidate.target_kind === 'user') {
    const ids = candidate.target_payload.user_ids;
    return Array.isArray(ids) && ids.includes(userId);
  }

  const { sql, params } = compileSegment(candidate.target_payload, 2);
  const res = await pool.query<{ ok: boolean }>(
    `SELECT TRUE AS ok FROM users u WHERE u.id = $1 AND u.deleted_at IS NULL AND (${sql}) LIMIT 1`,
    [userId, ...params],
  );
  return res.rows.length > 0;
};

/** Records that a view-once banner had its one showing. No-op for the rest. */
export const markBannerSeen = async (userId: string, bannerId: string): Promise<void> => {
  await pool.query(
    `INSERT INTO banner_views (user_id, banner_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, banner_id) DO NOTHING`,
    [userId, bannerId],
  );
};

/** How many users a segment currently matches — the admin's audience preview. */
export const countSegmentAudience = async (predicate: SegmentPredicate): Promise<number> => {
  const { sql, params } = compileSegment(predicate, 1);
  const res = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM users u WHERE u.deleted_at IS NULL AND (${sql})`,
    params,
  );
  return Number(res.rows[0]?.count ?? 0);
};
