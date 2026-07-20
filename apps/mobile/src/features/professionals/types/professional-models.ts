import type { CategoryItem } from '@features/home/types/home-models';

/** Full professional detail returned by GET /professionals/{id}. Mirrors mobile/lib/features/professionals/types/professional_models.dart. */
export interface ProfessionalDetail {
  id: string;
  name: string;
  role: string;
  rating: number;
  reviewCount: number;
  interests: string[];
  avatarKey?: string;
  coverPhotoKey?: string;
  description?: string;
  isAvailable: boolean;
}

export function professionalDetailFromJson(json: Record<string, unknown>): ProfessionalDetail {
  return {
    id: json.id as string,
    name: (json.name as string) ?? (json.full_name as string) ?? 'Anonymous',
    role: (json.role as string) ?? (json.occupation as string) ?? '',
    rating: (json.rating as number) ?? 0,
    reviewCount: (json.review_count as number) ?? 0,
    interests: ((json.interests as unknown[]) ?? []).map(String),
    avatarKey: json.avatar_url as string | undefined,
    coverPhotoKey: json.cover_photo_url as string | undefined,
    description: json.description as string | undefined,
    isAvailable: (json.is_available as boolean) ?? true,
  };
}

/** Discovery rate (read-only, shown on a pro's detail page — distinct from the editable Rate on /me/rates). */
export interface ProfessionalRateView {
  id: string;
  callType: string;
  durationMinutes: number;
  priceKobo: number;
  /** Derived per-minute price (floored), from the backend. Nullable: older responses omit it. */
  pricePerMinuteKobo?: number;
}

export function professionalRateViewFromJson(json: Record<string, unknown>): ProfessionalRateView {
  return {
    id: json.id as string,
    callType: json.call_type as string,
    durationMinutes: json.duration_minutes as number,
    priceKobo: json.price_kobo as number,
    pricePerMinuteKobo: json.price_per_minute_kobo as number | undefined,
  };
}

export interface ReviewItem {
  id: string;
  reviewerName: string;
  rating: number;
  comment?: string;
  createdAt: string;
  reviewerAvatarKey?: string;
}

export function reviewItemFromJson(json: Record<string, unknown>): ReviewItem {
  return {
    id: json.id as string,
    reviewerName: (json.reviewer_name as string) ?? 'Anonymous',
    rating: (json.rating as number) ?? 5,
    comment: json.comment as string | undefined,
    createdAt: (json.created_at as string) ?? new Date().toISOString(),
    reviewerAvatarKey: json.reviewer_avatar_url as string | undefined,
  };
}

/**
 * One slot in the availability grid. Backend grid is wall-clock based:
 * every slot is exactly durationMinutes long, so only the start instant
 * and an available flag are needed.
 */
export interface AvailabilitySlot {
  startAt: string;
  available: boolean;
}

export function availabilitySlotFromJson(json: Record<string, unknown>): AvailabilitySlot {
  return {
    startAt: (json.start_at as string) ?? new Date().toISOString(),
    available: (json.available as boolean) ?? true,
  };
}

export interface AvailabilityDay {
  date: string;
  slots: AvailabilitySlot[];
}

export function availabilityDayFromJson(json: Record<string, unknown>): AvailabilityDay {
  return {
    date: (json.date as string) ?? '',
    slots: ((json.slots as unknown[]) ?? []).map((e) => availabilitySlotFromJson(e as Record<string, unknown>)),
  };
}

export interface AvailabilityResponse {
  timezone: string;
  days: AvailabilityDay[];
}

export function availabilityResponseFromJson(json: Record<string, unknown>): AvailabilityResponse {
  return {
    timezone: (json.timezone as string) ?? 'Africa/Lagos',
    days: ((json.days as unknown[]) ?? []).map((e) => availabilityDayFromJson(e as Record<string, unknown>)),
  };
}

/** Shared sort keys for the professional search. */
export type ProSortKey = 'rating' | 'price' | 'name';
export type ProSortDirection = 'asc' | 'desc';

export interface CursorPage<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
}

export type { CategoryItem };
