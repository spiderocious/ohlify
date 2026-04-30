import { pool } from '@lib/db/pool.js';
import { id as newId } from '@lib/ids.js';

export interface BannerRow {
  id: string;
  title: string;
  subtitle: string | null;
  body: string | null;
  body_blocks: unknown;
  image_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
  deeplink: string | null;
  audience: string;
  placement: string;
  priority: number;
  is_active: boolean;
  starts_at: Date | null;
  ends_at: Date | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateBannerInput {
  title: string;
  subtitle: string | null;
  body: string | null;
  bodyBlocks: unknown;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  deeplink: string | null;
  audience: string;
  placement: string;
  priority: number;
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  createdBy: string | null;
}

export const create = async (input: CreateBannerInput): Promise<BannerRow> => {
  const bannerId = newId('ban');
  const res = await pool.query<BannerRow>(
    `INSERT INTO banners
       (id, title, subtitle, body, body_blocks, image_url, cta_label, cta_url, deeplink,
        audience, placement, priority, is_active, starts_at, ends_at, created_by)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9,
             $10::banner_audience, $11::banner_placement, $12, $13, $14, $15, $16)
     RETURNING *`,
    [
      bannerId,
      input.title,
      input.subtitle,
      input.body,
      JSON.stringify(input.bodyBlocks ?? []),
      input.imageUrl,
      input.ctaLabel,
      input.ctaUrl,
      input.deeplink,
      input.audience,
      input.placement,
      input.priority,
      input.isActive,
      input.startsAt,
      input.endsAt,
      input.createdBy,
    ],
  );
  return res.rows[0]!;
};

export const findById = async (bannerId: string): Promise<BannerRow | null> => {
  const res = await pool.query<BannerRow>(`SELECT * FROM banners WHERE id = $1`, [bannerId]);
  return res.rows[0] ?? null;
};

export interface UpdateBannerInput {
  title?: string;
  subtitle?: string | null;
  body?: string | null;
  bodyBlocks?: unknown;
  imageUrl?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  deeplink?: string | null;
  audience?: string;
  placement?: string;
  priority?: number;
  isActive?: boolean;
  startsAt?: Date | null;
  endsAt?: Date | null;
}

export const update = async (
  bannerId: string,
  input: UpdateBannerInput,
): Promise<BannerRow | null> => {
  // Build a dynamic SET clause from supplied fields. We deliberately list
  // each field explicitly instead of looping a generic map — keeps the
  // mapping from camelCase to snake_case visible at the call site.
  const sets: string[] = [];
  const params: unknown[] = [];
  const push = (sqlSnippet: string, value: unknown) => {
    params.push(value);
    sets.push(`${sqlSnippet} = $${params.length}`);
  };

  if (input.title !== undefined) push('title', input.title);
  if (input.subtitle !== undefined) push('subtitle', input.subtitle);
  if (input.body !== undefined) push('body', input.body);
  if (input.bodyBlocks !== undefined) {
    params.push(JSON.stringify(input.bodyBlocks ?? []));
    sets.push(`body_blocks = $${params.length}::jsonb`);
  }
  if (input.imageUrl !== undefined) push('image_url', input.imageUrl);
  if (input.ctaLabel !== undefined) push('cta_label', input.ctaLabel);
  if (input.ctaUrl !== undefined) push('cta_url', input.ctaUrl);
  if (input.deeplink !== undefined) push('deeplink', input.deeplink);
  if (input.audience !== undefined) {
    params.push(input.audience);
    sets.push(`audience = $${params.length}::banner_audience`);
  }
  if (input.placement !== undefined) {
    params.push(input.placement);
    sets.push(`placement = $${params.length}::banner_placement`);
  }
  if (input.priority !== undefined) push('priority', input.priority);
  if (input.isActive !== undefined) push('is_active', input.isActive);
  if (input.startsAt !== undefined) push('starts_at', input.startsAt);
  if (input.endsAt !== undefined) push('ends_at', input.endsAt);

  if (sets.length === 0) return findById(bannerId);

  params.push(bannerId);
  const res = await pool.query<BannerRow>(
    `UPDATE banners
       SET ${sets.join(', ')}, updated_at = now()
       WHERE id = $${params.length}
       RETURNING *`,
    params,
  );
  return res.rows[0] ?? null;
};

export const remove = async (bannerId: string): Promise<boolean> => {
  const res = await pool.query(`DELETE FROM banners WHERE id = $1`, [bannerId]);
  return (res.rowCount ?? 0) > 0;
};

export interface ListAdminQuery {
  limit: number;
  cursor?: { last_id: string; last_sort_key: string } | undefined;
  audience?: string | undefined;
  placement?: string | undefined;
  isActive?: boolean | undefined;
}

export const listAdmin = async (q: ListAdminQuery): Promise<BannerRow[]> => {
  const params: unknown[] = [];
  const filters: string[] = [];
  if (q.audience) {
    params.push(q.audience);
    filters.push(`audience = $${params.length}::banner_audience`);
  }
  if (q.placement) {
    params.push(q.placement);
    filters.push(`placement = $${params.length}::banner_placement`);
  }
  if (q.isActive !== undefined) {
    params.push(q.isActive);
    filters.push(`is_active = $${params.length}`);
  }
  if (q.cursor) {
    params.push(q.cursor.last_sort_key);
    params.push(q.cursor.last_id);
    filters.push(
      `(created_at < $${params.length - 1}::timestamptz OR (created_at = $${params.length - 1}::timestamptz AND id < $${params.length}))`,
    );
  }
  params.push(q.limit + 1);
  const where = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
  const res = await pool.query<BannerRow>(
    `SELECT * FROM banners
       ${where}
       ORDER BY priority DESC, created_at DESC, id DESC
       LIMIT $${params.length}`,
    params,
  );
  return res.rows;
};

export interface ListPublicQuery {
  audience?: 'clients' | 'professionals' | 'all' | undefined;
  placement?: 'home_top' | 'home_inline' | 'web_landing' | undefined;
}

// Public list: only banners that are active AND inside their schedule
// window (starts_at <= now AND (ends_at IS NULL OR ends_at > now)).
// `audience='all'` is always returned alongside the requested audience.
// Optional `placement` narrows to one slot.
export const listPublic = async (q: ListPublicQuery): Promise<BannerRow[]> => {
  const params: unknown[] = [];
  let audienceFilter: string;
  if (q.audience && q.audience !== 'all') {
    params.push(q.audience);
    audienceFilter = `(audience = 'all'::banner_audience OR audience = $${params.length}::banner_audience)`;
  } else {
    audienceFilter = `audience = 'all'::banner_audience`;
  }
  let placementFilter = 'TRUE';
  if (q.placement) {
    params.push(q.placement);
    placementFilter = `placement = $${params.length}::banner_placement`;
  }
  const res = await pool.query<BannerRow>(
    `SELECT * FROM banners
       WHERE is_active = TRUE
         AND ${audienceFilter}
         AND ${placementFilter}
         AND (starts_at IS NULL OR starts_at <= now())
         AND (ends_at IS NULL OR ends_at > now())
       ORDER BY priority DESC, created_at DESC`,
    params,
  );
  return res.rows;
};
