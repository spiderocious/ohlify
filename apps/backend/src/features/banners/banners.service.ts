import { decodeCursor, encodeCursor, resolveLimit } from '@lib/pagination.js';
import { ServiceError, ServiceSuccess } from '@lib/service-result.js';
import { MESSAGE_KEYS } from '@shared/constants/message-keys.js';

import * as repo from './banners.repo.js';
import type {
  CreateBannerDto,
  ListBannersAdminQueryDto,
  ListBannersPublicQueryDto,
  UpdateBannerDto,
} from './banners.schema.js';

const toView = (row: repo.BannerRow) => ({
  id: row.id,
  title: row.title,
  subtitle: row.subtitle,
  body: row.body,
  body_blocks: row.body_blocks,
  image_url: row.image_url,
  cta_label: row.cta_label,
  cta_url: row.cta_url,
  deeplink: row.deeplink,
  audience: row.audience,
  placement: row.placement,
  priority: row.priority,
  is_active: row.is_active,
  starts_at: row.starts_at?.toISOString() ?? null,
  ends_at: row.ends_at?.toISOString() ?? null,
  created_by: row.created_by,
  created_at: row.created_at.toISOString(),
  updated_at: row.updated_at.toISOString(),
});

// Public-safe view: strips internal fields the mobile app shouldn't see
// (created_by admin id, created_at/updated_at server-side bookkeeping,
// is_active — already true by definition for anything in this list).
const toPublicView = (row: repo.BannerRow) => ({
  id: row.id,
  title: row.title,
  subtitle: row.subtitle,
  body: row.body,
  body_blocks: row.body_blocks,
  image_url: row.image_url,
  cta_label: row.cta_label,
  cta_url: row.cta_url,
  deeplink: row.deeplink,
  audience: row.audience,
  placement: row.placement,
  priority: row.priority,
  starts_at: row.starts_at?.toISOString() ?? null,
  ends_at: row.ends_at?.toISOString() ?? null,
});

// Pre-flight check matching the DB-level `banners_window_chk` constraint.
// We could rely on Postgres to reject (the constraint catches it) but the
// Pg error code 23514 doesn't carry the field name back to the client, so
// we'd have to translate it anyway. Easier to validate up-front and return
// a structured field_errors response.
const validateWindow = (
  startsAt: Date | null,
  endsAt: Date | null,
): { starts_at?: string[]; ends_at?: string[] } | null => {
  if (startsAt !== null && endsAt !== null && startsAt >= endsAt) {
    return { starts_at: ['starts_at must be before ends_at'] };
  }
  return null;
};

// Resolves an incoming optional ISO timestamp against an existing column
// value. The schema only allows omit-or-string today (zod
// `z.string().datetime().optional()`), so we have two cases: omitted →
// keep current, present → replace. Explicit-null clearing isn't reachable
// from the public API.
const resolveTimestampPatch = (incoming: string | undefined, current: Date | null): Date | null =>
  incoming === undefined ? current : new Date(incoming);

// Build the snake_case → camelCase update payload from a partial DTO.
// Pulled out of updateBanner so cognitive complexity stays under the
// sonarjs threshold; the field-by-field mapping is the same shape as
// createBanner.
const buildUpdatePayload = (
  dto: UpdateBannerDto,
  nextStarts: Date | null,
  nextEnds: Date | null,
): repo.UpdateBannerInput => {
  const payload: repo.UpdateBannerInput = {};
  if (dto.title !== undefined) payload.title = dto.title;
  if (dto.subtitle !== undefined) payload.subtitle = dto.subtitle;
  if (dto.body !== undefined) payload.body = dto.body;
  if (dto.body_blocks !== undefined) payload.bodyBlocks = dto.body_blocks;
  if (dto.image_url !== undefined) payload.imageUrl = dto.image_url;
  if (dto.cta_label !== undefined) payload.ctaLabel = dto.cta_label;
  if (dto.cta_url !== undefined) payload.ctaUrl = dto.cta_url;
  if (dto.deeplink !== undefined) payload.deeplink = dto.deeplink;
  if (dto.audience !== undefined) payload.audience = dto.audience;
  if (dto.placement !== undefined) payload.placement = dto.placement;
  if (dto.priority !== undefined) payload.priority = dto.priority;
  if (dto.is_active !== undefined) payload.isActive = dto.is_active;
  if (dto.starts_at !== undefined) payload.startsAt = nextStarts;
  if (dto.ends_at !== undefined) payload.endsAt = nextEnds;
  return payload;
};

export const createBanner = async (dto: CreateBannerDto, adminId: string) => {
  const createdBy = adminId === 'adm_stub' ? null : adminId;
  const startsAt = dto.starts_at ? new Date(dto.starts_at) : null;
  const endsAt = dto.ends_at ? new Date(dto.ends_at) : null;
  const windowErr = validateWindow(startsAt, endsAt);
  if (windowErr) {
    return new ServiceError('validation_error', MESSAGE_KEYS.ADMIN_BANNER_CREATED, 422, windowErr);
  }
  const row = await repo.create({
    title: dto.title,
    subtitle: dto.subtitle ?? null,
    body: dto.body ?? null,
    bodyBlocks: dto.body_blocks ?? [],
    imageUrl: dto.image_url ?? null,
    ctaLabel: dto.cta_label ?? null,
    ctaUrl: dto.cta_url ?? null,
    deeplink: dto.deeplink ?? null,
    audience: dto.audience ?? 'all',
    placement: dto.placement,
    priority: dto.priority ?? 0,
    isActive: dto.is_active ?? false,
    startsAt,
    endsAt,
    createdBy,
  });
  return new ServiceSuccess(toView(row), MESSAGE_KEYS.ADMIN_BANNER_CREATED);
};

export const updateBanner = async (bannerId: string, dto: UpdateBannerDto) => {
  const existing = await repo.findById(bannerId);
  if (!existing) {
    return new ServiceError('not_found', MESSAGE_KEYS.ADMIN_BANNER_UPDATED, 404);
  }
  // PATCH may touch one bound or both; the DB constraint sees the merged
  // row, so we have to merge before validating.
  const nextStarts = resolveTimestampPatch(dto.starts_at, existing.starts_at);
  const nextEnds = resolveTimestampPatch(dto.ends_at, existing.ends_at);
  const windowErr = validateWindow(nextStarts, nextEnds);
  if (windowErr) {
    return new ServiceError('validation_error', MESSAGE_KEYS.ADMIN_BANNER_UPDATED, 422, windowErr);
  }
  const row = await repo.update(bannerId, buildUpdatePayload(dto, nextStarts, nextEnds));
  return new ServiceSuccess(toView(row!), MESSAGE_KEYS.ADMIN_BANNER_UPDATED);
};

export const deleteBanner = async (bannerId: string) => {
  const removed = await repo.remove(bannerId);
  if (!removed) {
    return new ServiceError('not_found', MESSAGE_KEYS.ADMIN_BANNER_DELETED, 404);
  }
  return new ServiceSuccess({ id: bannerId }, MESSAGE_KEYS.ADMIN_BANNER_DELETED);
};

// Short-circuit: flip is_active=true. If the banner is scheduled in the
// future (starts_at > now), also reset starts_at to now so it's
// immediately visible — matches the spec ("sets is_active: true,
// starts_at: now() if scheduled in the future"). ends_at unchanged.
export const launchBanner = async (bannerId: string) => {
  const existing = await repo.findById(bannerId);
  if (!existing) {
    return new ServiceError('not_found', MESSAGE_KEYS.ADMIN_BANNER_LAUNCHED, 404);
  }
  const now = new Date();
  const nextStarts =
    existing.starts_at !== null && existing.starts_at > now ? now : existing.starts_at;
  const row = await repo.update(bannerId, {
    isActive: true,
    ...(nextStarts !== existing.starts_at ? { startsAt: nextStarts } : {}),
  });
  return new ServiceSuccess(toView(row!), MESSAGE_KEYS.ADMIN_BANNER_LAUNCHED);
};

// Short-circuit: flip is_active=false. Schedule unchanged so the banner
// can be re-launched without re-editing the window.
export const pauseBanner = async (bannerId: string) => {
  const existing = await repo.findById(bannerId);
  if (!existing) {
    return new ServiceError('not_found', MESSAGE_KEYS.ADMIN_BANNER_PAUSED, 404);
  }
  const row = await repo.update(bannerId, { isActive: false });
  return new ServiceSuccess(toView(row!), MESSAGE_KEYS.ADMIN_BANNER_PAUSED);
};

export const listAdmin = async (dto: ListBannersAdminQueryDto) => {
  const limit = resolveLimit(dto.limit);
  let cursor: { last_id: string; last_sort_key: string } | undefined;
  if (dto.cursor !== undefined) {
    try {
      cursor = decodeCursor(dto.cursor);
    } catch {
      return new ServiceError('validation_error', MESSAGE_KEYS.ADMIN_BANNERS_LIST_FETCHED, 400, {
        cursor: ['Invalid cursor'],
      });
    }
  }
  const rows = await repo.listAdmin({
    limit,
    ...(cursor ? { cursor } : {}),
    ...(dto.audience ? { audience: dto.audience } : {}),
    ...(dto.placement ? { placement: dto.placement } : {}),
    ...(dto.is_active !== undefined ? { isActive: dto.is_active } : {}),
  });
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor({ last_id: last.id, last_sort_key: last.created_at.toISOString() })
      : null;
  return new ServiceSuccess(
    {
      items: page.map(toView),
      meta: { next_cursor: nextCursor, has_more: hasMore },
    },
    MESSAGE_KEYS.ADMIN_BANNERS_LIST_FETCHED,
  );
};

export const getAdmin = async (bannerId: string) => {
  const row = await repo.findById(bannerId);
  if (!row) {
    return new ServiceError('not_found', MESSAGE_KEYS.BANNER_FETCHED, 404);
  }
  return new ServiceSuccess(toView(row), MESSAGE_KEYS.BANNER_FETCHED);
};

export const listPublic = async (dto: ListBannersPublicQueryDto) => {
  const rows = await repo.listPublic({
    ...(dto.audience ? { audience: dto.audience } : {}),
    ...(dto.placement ? { placement: dto.placement } : {}),
  });
  return new ServiceSuccess({ items: rows.map(toPublicView) }, MESSAGE_KEYS.BANNERS_FETCHED);
};
