export interface ProfessionalListItem {
  id: string;
  name: string;
  occupation: string;
  /**
   * File-service key (e.g. `8204e793-….jpg`), NOT a URL. The field name is
   * historical. Render via `<AppAvatar fileKey={...}>` in the UI package,
   * which resolves the key through `useFilePreview` from `@ohlify/api`.
   */
  avatar_url: string | null;
  rating: number;
  review_count: number;
  base_price_kobo: number | null;
  currency: string;
  is_available: boolean;
  categories: string[];
}

export interface ProfessionalDetail extends ProfessionalListItem {
  /** File-service key. See note on {@link ProfessionalListItem.avatar_url}. */
  cover_photo_url: string | null;
  description: string | null;
  interests: string[];
  handle: string | null;
  share_slug: string | null;
}

export interface Category {
  value: string;
  label: string;
  icon_url: string | null;
}

export interface HomeResponse {
  upcoming_calls: unknown[];
  popular_professionals: ProfessionalListItem[];
  categories: Category[];
  active_meeting: null;
}

export interface ProfessionalsPage {
  data: ProfessionalListItem[];
  meta: { next_cursor: string | null; has_more: boolean };
}

export interface ApiRate {
  id: string;
  call_type: 'audio' | 'video';
  duration_minutes: number;
  price_kobo: number;
  currency: string;
}

export interface Review {
  id: string;
  reviewer_name: string;
  /** File-service key. See note on {@link ProfessionalListItem.avatar_url}. */
  reviewer_avatar_url: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface ReviewsPage {
  data: Review[];
  meta: { next_cursor: string | null; has_more: boolean };
}

export interface AvailabilityDay {
  date: string;
  slots: { start_at: string; available: boolean }[];
}

export interface AvailabilityResponse {
  timezone: string;
  days: AvailabilityDay[];
}
