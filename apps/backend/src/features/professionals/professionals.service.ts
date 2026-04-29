import crypto from 'node:crypto';

import * as categoriesService from '@features/categories/categories.service.js';
import * as ratesRepo from '@features/rates/rates.repo.js';
import { getOrCompute } from '@lib/cache/responseCache.js';
import { platformConfig } from '@lib/config/platform-config.service.js';
import { buildCursorPage, decodeCursor, resolveLimit } from '@lib/pagination.js';
import { ServiceError, ServiceSuccess } from '@lib/service-result.js';
import { MESSAGE_KEYS } from '@shared/constants/message-keys.js';

import { buildSlotGrid, validateIanaTz } from './availability.js';
import { cacheKeys } from './professionals.cache.js';
import * as repo from './professionals.repo.js';
import type {
  AvailabilityQueryDto,
  ListQueryDto,
  ReviewsQueryDto,
} from './professionals.schema.js';
import type {
  AvailabilityResponse,
  HomeResponse,
  ProfessionalDetail,
  ProfessionalDetailRow,
  ProfessionalListItem,
  ProfessionalListRow,
} from './professionals.types.js';

const SHARE_SLUG_SUFFIX_LEN = 6;
const POPULAR_LIMIT = 8;
const HOME_CACHE_TTL = 300;
const LIST_CACHE_TTL = 120;
const DETAIL_CACHE_TTL = 300;
const RATES_CACHE_TTL = 300;

const sha256 = (value: string): string => crypto.createHash('sha256').update(value).digest('hex');

const buildShareSlug = (handle: string | null, userId: string): string | null => {
  if (!handle) return null;
  return `${handle}-${sha256(userId).slice(0, SHARE_SLUG_SUFFIX_LEN)}`;
};

const toListItem = (row: ProfessionalListRow): ProfessionalListItem => ({
  id: row.id,
  name: row.full_name,
  occupation: row.occupation,
  avatar_url: row.avatar_url,
  rating: Number(row.rating),
  review_count: row.review_count,
  base_price_kobo: row.base_price_kobo === null ? null : Number(row.base_price_kobo),
  currency: 'NGN',
  is_available: row.is_available,
  categories: row.categories,
});

const toDetail = (row: ProfessionalDetailRow): ProfessionalDetail => ({
  id: row.id,
  name: row.full_name,
  occupation: row.occupation,
  avatar_url: row.avatar_url,
  cover_photo_url: row.cover_photo_url,
  description: row.description,
  rating: Number(row.rating),
  review_count: row.review_count,
  is_available: row.is_available,
  interests: row.interests,
  categories: row.categories,
  handle: row.handle,
  share_slug: buildShareSlug(row.handle, row.id),
  base_price_kobo: row.base_price_kobo === null ? null : Number(row.base_price_kobo),
  currency: 'NGN',
});

// ── GET /professionals ───────────────────────────────────────────────────────

const buildListCacheKey = (q: ListQueryDto): string => {
  const stable = JSON.stringify({
    q: q.q ?? null,
    category: q.category ?? null,
    sort: q.sort ?? 'rating',
    direction: q.direction ?? 'desc',
    cursor: q.cursor ?? null,
    limit: q.limit ?? null,
  });
  return `prof:list:${sha256(stable).slice(0, 24)}`;
};

export const list = async (dto: ListQueryDto) => {
  const sort = dto.sort ?? 'rating';
  const direction = dto.direction ?? (sort === 'rating' ? 'desc' : 'asc');
  const limit = resolveLimit(dto.limit);
  let cursorPayload: { sortKey: string; lastId: string } | undefined;
  if (dto.cursor !== undefined) {
    try {
      const decoded = decodeCursor(dto.cursor);
      cursorPayload = { sortKey: decoded.last_sort_key, lastId: decoded.last_id };
    } catch {
      return new ServiceError('validation_error', MESSAGE_KEYS.PROFESSIONALS_LIST_FETCHED, 400, {
        cursor: ['Invalid cursor'],
      });
    }
  }

  const cacheKey = buildListCacheKey(dto);

  const result = await getOrCompute(cacheKey, LIST_CACHE_TTL, async () => {
    const rows = await repo.list({
      q: dto.q,
      category: dto.category,
      sort,
      direction,
      limit,
      cursor: cursorPayload,
    });

    const items = rows.map(toListItem);
    return buildCursorPage(items, limit, (item) => {
      let sortKey: string;
      if (sort === 'rating') {
        sortKey = String(item.rating);
      } else if (sort === 'price') {
        sortKey = String(item.base_price_kobo ?? 0);
      } else {
        sortKey = item.name ?? '';
      }
      return { last_id: item.id, last_sort_key: sortKey };
    });
  });

  return new ServiceSuccess(result, MESSAGE_KEYS.PROFESSIONALS_LIST_FETCHED);
};

// ── GET /professionals/:id ───────────────────────────────────────────────────

export const detail = async (professionalId: string) => {
  const cacheKey = cacheKeys.detail(professionalId);
  const cached = await getOrCompute(cacheKey, DETAIL_CACHE_TTL, async () => {
    const row = await repo.findDetailById(professionalId);
    return row === null ? null : toDetail(row);
  });

  if (cached === null) {
    return new ServiceError('not_found', MESSAGE_KEYS.PROFESSIONAL_NOT_FOUND, 404);
  }
  return new ServiceSuccess(cached, MESSAGE_KEYS.PROFESSIONAL_FETCHED);
};

// ── GET /professionals/:id/rates ─────────────────────────────────────────────

export const rates = async (professionalId: string) => {
  const visible = await repo.isVisibleProfessional(professionalId);
  if (!visible) {
    return new ServiceError('not_found', MESSAGE_KEYS.PROFESSIONAL_NOT_FOUND, 404);
  }
  const cacheKey = cacheKeys.rates(professionalId);
  const ratesView = await getOrCompute(cacheKey, RATES_CACHE_TTL, async () => {
    const rows = await ratesRepo.findActiveByUser(professionalId);
    return rows.map((row) => ({
      id: row.id,
      call_type: row.call_type,
      duration_minutes: row.duration_minutes,
      price_kobo: Number(row.price_kobo),
      currency: row.currency,
    }));
  });
  return new ServiceSuccess(ratesView, MESSAGE_KEYS.PROFESSIONAL_RATES_FETCHED);
};

// ── GET /professionals/:id/reviews ───────────────────────────────────────────
//
// Delegates to the reviews feature now that §10 (reviews) has shipped. The
// professional must still be visible (active + KYC-approved) for the page
// to render — otherwise we'd surface reviews against a delisted pro.
export const reviews = async (professionalId: string, dto: ReviewsQueryDto) => {
  const visible = await repo.isVisibleProfessional(professionalId);
  if (!visible) {
    return new ServiceError('not_found', MESSAGE_KEYS.PROFESSIONAL_NOT_FOUND, 404);
  }
  const { reviewsService } = await import('@features/reviews/index.js');
  return reviewsService.listForProfessional(professionalId, {
    ...(dto.cursor !== undefined ? { cursor: dto.cursor } : {}),
    ...(dto.limit !== undefined ? { limit: dto.limit } : {}),
    ...(dto.rating_min !== undefined ? { rating_min: dto.rating_min } : {}),
    ...(dto.rating_max !== undefined ? { rating_max: dto.rating_max } : {}),
  });
};

// ── GET /professionals/:id/availability ──────────────────────────────────────

const parseDate = (s: string): Date => new Date(`${s}T00:00:00.000Z`);

const buildAvailability = (
  fromDate: Date,
  toDateExclusive: Date,
  tz: string,
): AvailabilityResponse => {
  const config = platformConfig.availability();
  const days = buildSlotGrid({
    fromDate,
    toDateExclusive,
    config,
    tz,
    now: new Date(),
  });
  return {
    timezone: tz,
    days,
  };
};

export const availability = async (professionalId: string, dto: AvailabilityQueryDto) => {
  const visible = await repo.isVisibleProfessional(professionalId);
  if (!visible) {
    return new ServiceError('not_found', MESSAGE_KEYS.PROFESSIONAL_NOT_FOUND, 404);
  }

  const config = platformConfig.availability();
  const tz = dto.tz ?? config.default_timezone;
  if (!validateIanaTz(tz)) {
    return new ServiceError(
      'validation_error',
      MESSAGE_KEYS.PROFESSIONAL_AVAILABILITY_FETCHED,
      400,
      { tz: ['Invalid IANA timezone'] },
    );
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const fromDate = dto.from !== undefined ? parseDate(dto.from) : today;
  const defaultTo = new Date(fromDate);
  defaultTo.setUTCDate(defaultTo.getUTCDate() + config.default_window_days);
  const toDateExclusive = dto.to !== undefined ? parseDate(dto.to) : defaultTo;

  if (toDateExclusive <= fromDate) {
    return new ServiceError(
      'validation_error',
      MESSAGE_KEYS.PROFESSIONAL_AVAILABILITY_FETCHED,
      400,
      { to: ['`to` must be after `from`'] },
    );
  }

  const windowDays = Math.round(
    (toDateExclusive.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (windowDays > config.max_window_days) {
    return new ServiceError(
      'value_out_of_range',
      MESSAGE_KEYS.PROFESSIONAL_AVAILABILITY_FETCHED,
      422,
      { to: [`window cannot exceed ${config.max_window_days} days`] },
    );
  }

  // No cache: spec marks availability as 🔴 Cold (slot grid changes any moment
  // a booking is created/cancelled).
  const result = buildAvailability(fromDate, toDateExclusive, tz);
  return new ServiceSuccess(result, MESSAGE_KEYS.PROFESSIONAL_AVAILABILITY_FETCHED);
};

// ── GET /home ────────────────────────────────────────────────────────────────

export const home = async (userId: string) => {
  const cacheKey = cacheKeys.home(userId);
  const result = await getOrCompute<HomeResponse>(cacheKey, HOME_CACHE_TTL, async () => {
    const [popularRows, categories] = await Promise.all([
      repo.popular(POPULAR_LIMIT),
      categoriesService.listAllRaw(),
    ]);
    return {
      // Bookings feature ships these later. For now return empty/null so the
      // mobile home screen renders correctly without missing the bootstrap.
      upcoming_calls: [],
      popular_professionals: popularRows.map(toListItem),
      categories,
      active_meeting: null,
    };
  });
  return new ServiceSuccess(result, MESSAGE_KEYS.HOME_FETCHED);
};
