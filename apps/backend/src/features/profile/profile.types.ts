import type { UserRole } from '@features/auth/auth.types.js';

export interface MeView {
  id: string;
  role: UserRole;
  full_name: string | null;
  email: string;
  email_verified: boolean;
  phone_number: string;
  phone_verified: boolean;
  handle: string | null;
  share_slug: string | null;
  avatar_url: string | null;
  cover_photo_url: string | null;
  occupation: string | null;
  description: string | null;
  interests: string[];
  categories: string[];
  is_available: boolean;
  rating: number;
  review_count: number;
  kyc_status: 'none' | 'pending_review' | 'approved' | 'rejected';
  created_at: string;
}

export interface NotificationPreferencesRow {
  user_id: string;
  sms_enabled: boolean;
  sms_updated_at: Date;
  email_enabled: boolean;
  email_updated_at: Date;
  push_enabled: boolean;
  push_updated_at: Date;
}

export interface NotificationPreferencesView {
  sms: { enabled: boolean; updated_at: string };
  email: { enabled: boolean; updated_at: string };
  push: { enabled: boolean; updated_at: string };
}

export interface BankAccountRow {
  user_id: string;
  account_number: string;
  bank_code: string;
  bank_name: string;
  account_name: string;
  paystack_recipient_code: string | null;
  added_at: Date;
  updated_at: Date;
}

export interface BankAccountView {
  account_number: string;
  account_number_masked: string;
  bank_code: string;
  bank_name: string;
  account_name: string;
  added_at: string;
}
