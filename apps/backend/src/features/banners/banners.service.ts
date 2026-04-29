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
  body: row.body,
  image_url: row.image_url,
  cta_label: row.cta_label,
  cta_url: row.cta_url,
  audience: row.audience,
  priority: row.priority,
  is_active: row.is_active,
  starts_at: row.starts_at?.toISOString() ?? null,
  ends_at: row.ends_at?.toISOString() ?? null,
  created_by: row.created_by,
  created_at: row.created_at.toISOString(),
  updated_at: row.updated_at.toISOString(),
});

// Public-safe view: strips internal fields the mobile app shouldn't see.
const toPublicView = (row: repo.BannerRow) => ({
  id: row.id,
  title: row.title,
  body: row.body,
  image_url: row.image_url,
  cta_label: row.cta_label,
  cta_url: row.cta_url,
  audience: row.audience,
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
    body: dto.body ?? null,
    imageUrl: dto.image_url ?? null,
    ctaLabel: dto.cta_label ?? null,
    ctaUrl: dto.cta_url ?? null,
    audience: dto.audience ?? 'all',
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
  const row = await repo.update(bannerId, {
    ...(dto.title !== undefined ? { title: dto.title } : {}),
    ...(dto.body !== undefined ? { body: dto.body } : {}),
    ...(dto.image_url !== undefined ? { imageUrl: dto.image_url } : {}),
    ...(dto.cta_label !== undefined ? { ctaLabel: dto.cta_label } : {}),
    ...(dto.cta_url !== undefined ? { ctaUrl: dto.cta_url } : {}),
    ...(dto.audience !== undefined ? { audience: dto.audience } : {}),
    ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
    ...(dto.is_active !== undefined ? { isActive: dto.is_active } : {}),
    ...(dto.starts_at !== undefined ? { startsAt: nextStarts } : {}),
    ...(dto.ends_at !== undefined ? { endsAt: nextEnds } : {}),
  });
  return new ServiceSuccess(toView(row!), MESSAGE_KEYS.ADMIN_BANNER_UPDATED);
};

export const deleteBanner = async (bannerId: string) => {
  const removed = await repo.remove(bannerId);
  if (!removed) {
    return new ServiceError('not_found', MESSAGE_KEYS.ADMIN_BANNER_DELETED, 404);
  }
  return new ServiceSuccess({ id: bannerId }, MESSAGE_KEYS.ADMIN_BANNER_DELETED);
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
  const rows = await repo.listPublic(dto.audience);
  return new ServiceSuccess({ items: rows.map(toPublicView) }, MESSAGE_KEYS.BANNERS_FETCHED);
};
