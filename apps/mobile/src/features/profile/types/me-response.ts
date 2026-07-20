import type { Role } from '@ohlify/core';

/**
 * Mirrors mobile/lib/features/profile/types/me_response.dart (itself mirrors
 * MeResponse from packages/api/src/profile/types.ts).
 */
export interface MeResponse {
  id: string;
  role: Role;
  fullName?: string;
  email: string;
  emailVerified: boolean;
  phoneNumber: string;
  phoneVerified: boolean;
  handle?: string;
  shareSlug?: string;
  /** File-service `key` (NOT a URL) — feed into AppFilePreview/AppAvatar. */
  avatarKey?: string;
  coverPhotoKey?: string;
  occupation?: string;
  description?: string;
  interests: string[];
  categories: string[];
  isAvailable: boolean;
  rating: number;
  reviewCount: number;
  /** 'none' | 'pending_review' | 'approved' | 'rejected'. */
  kycStatus: string;
  createdAt: string;
}

export function meResponseFromJson(json: Record<string, unknown>): MeResponse {
  return {
    id: json.id as string,
    role: json.role === 'professional' ? 'professional' : 'client',
    fullName: json.full_name as string | undefined,
    email: json.email as string,
    emailVerified: (json.email_verified as boolean) ?? false,
    phoneNumber: (json.phone_number as string) ?? '',
    phoneVerified: (json.phone_verified as boolean) ?? false,
    handle: json.handle as string | undefined,
    shareSlug: json.share_slug as string | undefined,
    // Backend stores a key in avatar_url / cover_photo_url despite the name.
    avatarKey: json.avatar_url as string | undefined,
    coverPhotoKey: json.cover_photo_url as string | undefined,
    occupation: json.occupation as string | undefined,
    description: json.description as string | undefined,
    interests: ((json.interests as unknown[]) ?? []).map(String),
    categories: ((json.categories as unknown[]) ?? []).map(String),
    isAvailable: (json.is_available as boolean) ?? false,
    rating: (json.rating as number) ?? 0,
    reviewCount: (json.review_count as number) ?? 0,
    kycStatus: (json.kyc_status as string) ?? 'none',
    createdAt: (json.created_at as string) ?? new Date().toISOString(),
  };
}
