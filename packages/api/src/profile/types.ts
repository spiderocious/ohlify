export interface MeResponse {
  id: string;
  role: 'client' | 'professional';
  full_name: string | null;
  email: string;
  email_verified: boolean;
  phone_number: string;
  phone_verified: boolean;
  handle: string | null;
  share_slug: string | null;
  /**
   * File-service key (e.g. `8204e793-….jpg`), NOT a URL. Render via
   * `<AppAvatar fileKey={...}>`.
   */
  avatar_url: string | null;
  /** File-service key. Same semantics as `avatar_url`. */
  cover_photo_url: string | null;
  occupation: string | null;
  description: string | null;
  interests: string[];
  categories: string[];
  is_available: boolean;
  rating: number;
  review_count: number;
  kyc_status: 'none' | 'pending_review' | 'approved';
  created_at: string;
}

export interface BankAccount {
  account_number: string;
  account_number_masked: string;
  bank_code: string;
  bank_name: string;
  account_name: string;
  added_at: string;
}

export interface Bank {
  code: string;
  name: string;
  logo_url: string | null;
}

export interface Rate {
  id: string;
  call_type: 'audio' | 'video';
  duration_minutes: number;
  price_kobo: number;
  /**
   * Derived per-minute price (floored): floor(price_kobo / duration_minutes).
   * Nullable while the single-rate rollout is in flight (older responses omit it).
   */
  price_per_minute_kobo: number | null;
  currency: string;
}

export interface NotificationPreferences {
  sms: { enabled: boolean; updated_at: string };
  email: { enabled: boolean; updated_at: string };
  push: { enabled: boolean; updated_at: string };
}

/**
 * A pro-declared "do not book me here" recurring window. Minutes are
 * minute-of-day (0..1440) in the pro's local timezone (today: platform
 * default `Africa/Lagos`). `end_minute` is exclusive and must be > start.
 *
 * Cross-midnight blocks aren't allowed in v1 — split into two rows.
 */
export interface BookingBlock {
  start_minute: number;
  end_minute: number;
}

export interface BookingBlocksResponse {
  blocks: BookingBlock[];
}
