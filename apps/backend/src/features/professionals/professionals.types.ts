import type { CategoryView } from '@features/categories/categories.types.js';
import type { CallType, RateView } from '@features/rates/rates.types.js';

export type SortField = 'rating' | 'price' | 'name';
export type SortDirection = 'asc' | 'desc';

export interface ProfessionalListItem {
  id: string;
  name: string | null;
  occupation: string | null;
  avatar_url: string | null;
  rating: number;
  review_count: number;
  base_price_kobo: number | null;
  currency: string;
  is_available: boolean;
  categories: string[];
}

export interface ProfessionalDetail {
  id: string;
  name: string | null;
  occupation: string | null;
  avatar_url: string | null;
  cover_photo_url: string | null;
  description: string | null;
  rating: number;
  review_count: number;
  is_available: boolean;
  interests: string[];
  categories: string[];
  handle: string | null;
  share_slug: string | null;
  base_price_kobo: number | null;
  currency: string;
}

export interface ReviewView {
  id: string;
  author_name: string | null;
  author_avatar_url: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface AvailabilityDay {
  date: string;
  slots: AvailabilitySlot[];
}

export interface AvailabilitySlot {
  start_at: string;
  available: boolean;
}

export interface AvailabilityResponse {
  timezone: string;
  days: AvailabilityDay[];
}

export interface UpcomingCallView {
  // Placeholder until §8 Bookings ships. Shape follows api-needed.md §7.1.5.
  // Returns empty list from /home today.
  id: string;
  status: string;
  call_type: CallType;
  scheduled_at: string;
  duration_minutes: number;
  counterparty: {
    id: string;
    name: string | null;
    avatar_url: string | null;
  };
}

export interface ActiveMeetingView {
  call_id: string;
  professional_name: string | null;
  professional_avatar_url: string | null;
  scheduled_start_at: string;
  call_type: CallType;
}

export interface HomeResponse {
  upcoming_calls: UpcomingCallView[];
  popular_professionals: ProfessionalListItem[];
  categories: CategoryView[];
  active_meeting: ActiveMeetingView | null;
}

// Internal repo row shapes
export interface ProfessionalListRow {
  id: string;
  full_name: string | null;
  occupation: string | null;
  avatar_url: string | null;
  is_available: boolean;
  categories: string[];
  rating: string;
  review_count: number;
  base_price_kobo: string | null;
}

export interface ProfessionalDetailRow extends ProfessionalListRow {
  description: string | null;
  cover_photo_url: string | null;
  interests: string[];
  handle: string | null;
}

export type RateRowForView = RateView;
