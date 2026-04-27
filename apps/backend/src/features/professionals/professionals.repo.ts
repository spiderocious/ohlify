import { pool } from '@lib/db/pool.js';
import { logger } from '@lib/logger.js';

import type {
  ProfessionalDetailRow,
  ProfessionalListRow,
  SortDirection,
  SortField,
} from './professionals.types.js';

// review_aggregates ships with §10 (feedback + rating). Until then the table
// may be absent in some environments. We probe for it once on first use and
// emit different SQL depending on the result. The cache is invalidated only on
// process restart — when §10 deploys, the new table is picked up after the
// next deploy. Acceptable for the pre-§10 launch window.
let reviewAggregatesPresent: boolean | null = null;

const detectReviewAggregates = async (): Promise<boolean> => {
  if (reviewAggregatesPresent !== null) return reviewAggregatesPresent;
  const res = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1
         FROM information_schema.tables
        WHERE table_schema = current_schema()
          AND table_name = 'review_aggregates'
     ) AS exists`,
  );
  reviewAggregatesPresent = res.rows[0]?.exists ?? false;
  if (!reviewAggregatesPresent) {
    logger.warn(
      {},
      'review_aggregates table absent — professionals queries will return rating=0, review_count=0',
    );
  }
  return reviewAggregatesPresent;
};

const baseFieldsSql = (hasAggregates: boolean): string => {
  const ratingExpr = hasAggregates ? 'COALESCE(ra.rating, 0)::text' : `'0'::text`;
  const countExpr = hasAggregates ? 'COALESCE(ra.review_count, 0)::int' : '0::int';
  return `
    u.id,
    u.full_name,
    u.occupation,
    u.avatar_url,
    u.is_available,
    u.categories,
    ${ratingExpr} AS rating,
    ${countExpr} AS review_count,
    (
      SELECT MIN(price_kobo)::text
        FROM professional_rates pr
       WHERE pr.user_id = u.id AND pr.deleted_at IS NULL
    ) AS base_price_kobo
  `;
};

const aggregatesJoinSql = (hasAggregates: boolean): string =>
  hasAggregates ? 'LEFT JOIN review_aggregates ra ON ra.user_id = u.id' : '';

const PROFESSIONAL_VISIBLE_PREDICATE = `
  u.role = 'professional'
  AND u.deleted_at IS NULL
  AND u.kyc_status = 'approved'
`;

interface ListInput {
  q?: string | undefined;
  category?: string | undefined;
  sort: SortField;
  direction: SortDirection;
  limit: number;
  cursor?: { sortKey: string; lastId: string } | undefined;
}

// SQL expression used for ORDER BY + cursor comparison. Numeric for rating /
// price (so cursor compare is numeric, not lexicographic). Text for name.
// When review_aggregates is missing, rating sort collapses to a constant
// expression — the cursor walk still works because tied rows fall through to
// the u.id ASC tiebreaker.
const sortExprFor = (
  sort: SortField,
  hasAggregates: boolean,
): { expr: string; cast: 'numeric' | 'text' } => {
  switch (sort) {
    case 'rating':
      return {
        expr: hasAggregates ? 'COALESCE(ra.rating, 0)' : '0::numeric',
        cast: 'numeric',
      };
    case 'price':
      return {
        expr: `COALESCE(
          (
            SELECT MIN(price_kobo)
              FROM professional_rates pr
             WHERE pr.user_id = u.id AND pr.deleted_at IS NULL
          ),
          0
        )`,
        cast: 'numeric',
      };
    case 'name':
    default:
      return { expr: `COALESCE(u.full_name, '')`, cast: 'text' };
  }
};

// Cursor pagination on (sortExpr, u.id). The id tiebreaker is always ASC so
// the cursor predicate `u.id > $idParam` walks forward regardless of sort
// direction. The sort expression's direction follows `input.direction`.
export const list = async (input: ListInput): Promise<ProfessionalListRow[]> => {
  const hasAggregates = await detectReviewAggregates();
  const params: unknown[] = [];
  const conditions: string[] = [PROFESSIONAL_VISIBLE_PREDICATE];

  if (input.q !== undefined) {
    params.push(input.q);
    conditions.push(`
      to_tsvector('simple', coalesce(u.full_name,'') || ' ' || coalesce(u.occupation,''))
        @@ plainto_tsquery('simple', $${params.length})
    `);
  }
  if (input.category !== undefined) {
    params.push(input.category);
    conditions.push(`$${params.length} = ANY(u.categories)`);
  }

  const { expr: sortExpr, cast } = sortExprFor(input.sort, hasAggregates);
  const dir = input.direction === 'asc' ? 'ASC' : 'DESC';

  if (input.cursor !== undefined) {
    params.push(input.cursor.sortKey);
    const sortParam = `$${params.length}::${cast}`;
    params.push(input.cursor.lastId);
    const idParam = `$${params.length}`;
    const cmp = input.direction === 'asc' ? '>' : '<';
    conditions.push(
      `(${sortExpr} ${cmp} ${sortParam} OR (${sortExpr} = ${sortParam} AND u.id > ${idParam}))`,
    );
  }

  params.push(input.limit + 1);
  const limitParam = `$${params.length}`;

  const sql = `
    SELECT ${baseFieldsSql(hasAggregates)}
      FROM users u
      ${aggregatesJoinSql(hasAggregates)}
     WHERE ${conditions.join(' AND ')}
     ORDER BY ${sortExpr} ${dir} NULLS LAST, u.id ASC
     LIMIT ${limitParam}
  `;

  const res = await pool.query<ProfessionalListRow>(sql, params);
  return res.rows;
};

export const findDetailById = async (
  professionalId: string,
): Promise<ProfessionalDetailRow | null> => {
  const hasAggregates = await detectReviewAggregates();
  const sql = `
    SELECT ${baseFieldsSql(hasAggregates)},
           u.description,
           u.cover_photo_url,
           u.interests,
           u.handle
      FROM users u
      ${aggregatesJoinSql(hasAggregates)}
     WHERE u.id = $1
       AND ${PROFESSIONAL_VISIBLE_PREDICATE}
     LIMIT 1
  `;
  const res = await pool.query<ProfessionalDetailRow>(sql, [professionalId]);
  return res.rows[0] ?? null;
};

// Used by /home for popular_professionals. Fixed limit, no cursor.
export const popular = async (limit: number): Promise<ProfessionalListRow[]> =>
  list({
    sort: 'rating',
    direction: 'desc',
    limit,
  });

// Tiny helper used everywhere we need a yes/no on visibility (rates, reviews,
// availability sub-routes share the parent's 404 if the pro isn't visible).
export const isVisibleProfessional = async (professionalId: string): Promise<boolean> => {
  const res = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM users u
        WHERE u.id = $1 AND ${PROFESSIONAL_VISIBLE_PREDICATE}
     ) AS exists`,
    [professionalId],
  );
  return res.rows[0]?.exists ?? false;
};
