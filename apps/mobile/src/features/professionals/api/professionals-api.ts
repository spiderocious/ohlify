import { apiClient } from '@shared/api/api-client';

import { categoryItemFromJson, professionalListItemFromJson, type CategoryItem, type ProfessionalListItem } from '@features/home/types/home-models';

import {
  availabilityResponseFromJson,
  professionalDetailFromJson,
  professionalRateViewFromJson,
  reviewItemFromJson,
  type AvailabilityResponse,
  type CursorPage,
  type ProfessionalDetail,
  type ProfessionalRateView,
  type ProSortDirection,
  type ProSortKey,
  type ReviewItem,
} from '../types/professional-models';

function ymd(d: Date): string {
  return `${String(d.getFullYear()).padStart(4, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Mirrors mobile/lib/features/professionals/professionals_api.dart's ProfessionalsApiHttp. */
export const professionalsApi = {
  async search(params?: {
    query?: string;
    category?: string;
    sort?: ProSortKey;
    direction?: ProSortDirection;
    cursor?: string;
    limit?: number;
  }): Promise<CursorPage<ProfessionalListItem>> {
    return apiClient.get('professionals', {
      queryParams: {
        sort: params?.sort ?? 'rating',
        direction: params?.direction ?? 'desc',
        limit: params?.limit ?? 20,
        q: params?.query,
        category: params?.category,
        cursor: params?.cursor,
      },
      fromJson: (data) => {
        if (Array.isArray(data)) {
          return { items: data.map((e) => professionalListItemFromJson(e as Record<string, unknown>)), hasMore: false };
        }
        const map = data as Record<string, unknown>;
        const items = (Array.isArray(map.data) ? map.data : []).map((e) => professionalListItemFromJson(e as Record<string, unknown>));
        const meta = (map.meta as Record<string, unknown>) ?? {};
        return { items, nextCursor: meta.next_cursor as string | undefined, hasMore: (meta.has_more as boolean) ?? false };
      },
    }) as Promise<CursorPage<ProfessionalListItem>>;
  },

  async getById(id: string): Promise<ProfessionalDetail> {
    return apiClient.get(`professionals/${id}`, {
      fromJson: (data) => professionalDetailFromJson(data as Record<string, unknown>),
    }) as Promise<ProfessionalDetail>;
  },

  async getRates(id: string): Promise<ProfessionalRateView[]> {
    return apiClient.get(`professionals/${id}/rates`, {
      fromJson: (data) => (data as unknown[]).map((e) => professionalRateViewFromJson(e as Record<string, unknown>)),
    }) as Promise<ProfessionalRateView[]>;
  },

  async getReviews(id: string, params?: { cursor?: string; limit?: number }): Promise<CursorPage<ReviewItem>> {
    return apiClient.get(`professionals/${id}/reviews`, {
      queryParams: { limit: params?.limit ?? 20, cursor: params?.cursor },
      fromJson: (data) => {
        const map = data as Record<string, unknown>;
        const items = (Array.isArray(map.data) ? map.data : []).map((e) => reviewItemFromJson(e as Record<string, unknown>));
        const meta = (map.meta as Record<string, unknown>) ?? {};
        return { items, nextCursor: meta.next_cursor as string | undefined, hasMore: (meta.has_more as boolean) ?? false };
      },
    }) as Promise<CursorPage<ReviewItem>>;
  },

  async listCategories(): Promise<CategoryItem[]> {
    return apiClient.get('professional-categories', {
      fromJson: (data) => (data as unknown[]).map((e) => categoryItemFromJson(e as Record<string, unknown>)),
    }) as Promise<CategoryItem[]>;
  },

  async getAvailability(
    id: string,
    params: { from: Date; to: Date; callType: string; durationMinutes: number; tz?: string },
  ): Promise<AvailabilityResponse> {
    return apiClient.get(`professionals/${id}/availability`, {
      queryParams: {
        from: ymd(params.from),
        to: ymd(params.to),
        call_type: params.callType,
        duration_minutes: params.durationMinutes,
        tz: params.tz,
      },
      fromJson: (data) => availabilityResponseFromJson(data as Record<string, unknown>),
    }) as Promise<AvailabilityResponse>;
  },
};
