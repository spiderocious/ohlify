/**
 * Lightweight DTOs used by GET /home. Mirrors
 * mobile/lib/features/home/types/home_models.dart.
 */
export interface ProfessionalListItem {
  id: string;
  name: string;
  role: string;
  rating: number;
  reviewCount: number;
  /** File-service keys — feed into AppAvatar/AppFilePreview. */
  avatarKey?: string;
  coverPhotoKey?: string;
  /** Lowest rate in kobo, optional. */
  basePriceKobo?: number;
  isAvailable: boolean;
}

export function professionalListItemFromJson(json: Record<string, unknown>): ProfessionalListItem {
  return {
    id: json.id as string,
    name: (json.name as string) ?? (json.full_name as string) ?? 'Anonymous',
    role: (json.role as string) ?? (json.occupation as string) ?? '',
    rating: (json.rating as number) ?? 0,
    reviewCount: (json.review_count as number) ?? 0,
    avatarKey: json.avatar_url as string | undefined,
    coverPhotoKey: json.cover_photo_url as string | undefined,
    basePriceKobo: json.base_price_kobo as number | undefined,
    isAvailable: (json.is_available as boolean) ?? true,
  };
}

export interface CategoryItem {
  value: string;
  label: string;
}

export function categoryItemFromJson(json: Record<string, unknown>): CategoryItem {
  return {
    value: (json.value as string) ?? (json.id as string) ?? '',
    label: (json.label as string) ?? (json.name as string) ?? '',
  };
}

export interface UpcomingCallItem {
  id: string;
  peerName: string;
  callType: 'audio' | 'video';
  startAt: string;
  peerAvatarKey?: string;
}

export function upcomingCallItemFromJson(json: Record<string, unknown>): UpcomingCallItem {
  return {
    id: json.id as string,
    peerName: (json.peer_name as string) ?? 'Unknown',
    callType: json.call_type === 'video' ? 'video' : 'audio',
    startAt: (json.start_at as string) ?? new Date().toISOString(),
    peerAvatarKey: json.peer_avatar_url as string | undefined,
  };
}

export interface ActiveMeeting {
  callId: string;
  peerName: string;
}

function activeMeetingFromJson(json: Record<string, unknown>): ActiveMeeting {
  return {
    callId: json.call_id as string,
    peerName: (json.peer_name as string) ?? 'Unknown',
  };
}

export interface HomeResponse {
  popularProfessionals: ProfessionalListItem[];
  categories: CategoryItem[];
  upcomingCalls: UpcomingCallItem[];
  activeMeeting?: ActiveMeeting;
}

export function homeResponseFromJson(json: Record<string, unknown>): HomeResponse {
  return {
    popularProfessionals: ((json.popular_professionals as unknown[]) ?? []).map((e) =>
      professionalListItemFromJson(e as Record<string, unknown>),
    ),
    categories: ((json.categories as unknown[]) ?? []).map((e) => categoryItemFromJson(e as Record<string, unknown>)),
    upcomingCalls: ((json.upcoming_calls as unknown[]) ?? []).map((e) => upcomingCallItemFromJson(e as Record<string, unknown>)),
    activeMeeting:
      json.active_meeting && typeof json.active_meeting === 'object'
        ? activeMeetingFromJson(json.active_meeting as Record<string, unknown>)
        : undefined,
  };
}
