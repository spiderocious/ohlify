import { pool } from '@lib/db/pool.js';

import type {
  ProfessionalDetailRow,
  ProfessionalListRow,
  SortDirection,
  SortField,
} from './professionals.types.js';

// review_aggregates ships with migration 0050 and is now mandatory. The
// runtime probe that used to live here is gone — if the table doesn't exist
// the SQL fails loudly, which is the correct behavior post-launch.
const baseFieldsSql = (): string => `
  u.id,
  u.full_name,
  u.occupation,
  u.avatar_url,
  u.is_available,
  u.categories,
  COALESCE(ra.rating, 0)::text AS rating,
  COALESCE(ra.review_count, 0)::int AS review_count,
  (
    SELECT MIN(price_kobo)::text
      FROM professional_rates pr
     WHERE pr.user_id = u.id AND pr.deleted_at IS NULL
  ) AS base_price_kobo
`;

const aggregatesJoinSql = (): string => 'LEFT JOIN review_aggregates ra ON ra.user_id = u.id';

// A suspended or blocked professional must disappear from discovery entirely —
// list, detail, rates, and reviews all gate on this predicate. kyc_status stays
// 'approved' through a suspension, so status must be checked explicitly.
// (BUGS.md D8.)
const PROFESSIONAL_VISIBLE_PREDICATE = `
  u.role = 'professional'
  AND u.deleted_at IS NULL
  AND u.status = 'active'
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
const sortExprFor = (sort: SortField): { expr: string; cast: 'numeric' | 'text' } => {
  switch (sort) {
    case 'rating':
      return {
        expr: 'COALESCE(ra.rating, 0)',
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
//
// Search uses Postgres FTS over (full_name, occupation, interests). Migration
// 0050 makes review_aggregates mandatory so the aggregates join is always
// present. When two rows are equal on the primary sort, rating DESC is the
// secondary tiebreaker (Phase 2 search polish).
export const list = async (input: ListInput): Promise<ProfessionalListRow[]> => {
  const params: unknown[] = [];
  const conditions: string[] = [PROFESSIONAL_VISIBLE_PREDICATE];

  if (input.q !== undefined) {
    params.push(input.q);
    conditions.push(`
      to_tsvector('simple',
        coalesce(u.full_name, '') || ' ' ||
        coalesce(u.occupation, '') || ' ' ||
        coalesce(array_to_string(u.interests, ' '), '')
      ) @@ plainto_tsquery('simple', $${params.length})
    `);
  }
  if (input.category !== undefined) {
    params.push(input.category);
    conditions.push(`$${params.length} = ANY(u.categories)`);
  }

  const { expr: sortExpr, cast } = sortExprFor(input.sort);
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

  // Secondary tiebreaker: rating DESC. Tertiary: u.id ASC (deterministic).
  // When the primary sort already IS rating, the secondary is a no-op but
  // harmless.
  const sql = `
    SELECT ${baseFieldsSql()}
      FROM users u
      ${aggregatesJoinSql()}
     WHERE ${conditions.join(' AND ')}
     ORDER BY ${sortExpr} ${dir} NULLS LAST,
              COALESCE(ra.rating, 0) DESC NULLS LAST,
              u.id ASC
     LIMIT ${limitParam}
  `;

  const res = await pool.query<ProfessionalListRow>(sql, params);
  return res.rows;
};

export const findDetailById = async (
  professionalId: string,
): Promise<ProfessionalDetailRow | null> => {
  const sql = `
    SELECT ${baseFieldsSql()},
           u.description,
           u.cover_photo_url,
           u.interests,
           u.handle
      FROM users u
      ${aggregatesJoinSql()}
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
