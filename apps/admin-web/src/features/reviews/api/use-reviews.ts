import { useQueryClient } from '@tanstack/react-query';

import {
  ADMIN_EP,
  type AdminReviewDetailView,
  type AdminReviewView,
} from '@ohlify/api';

import { useAdminMutation } from '../../../shared/api/use-admin-mutation.js';
import { useAdminQuery } from '../../../shared/api/use-admin-query.js';
import { useCursorList } from '../../../shared/api/use-cursor-list.js';

type ReviewsFilters = {
  rating_max?: string;
  flagged?: string;
  user_id?: string;
  professional_id?: string;
  only_hidden?: string;
  [k: string]: string | undefined;
};

export function useReviews(filters: ReviewsFilters) {
  return useCursorList<AdminReviewView>({
    key: ['admin', 'reviews'],
    url: ADMIN_EP.REVIEWS,
    filters,
  });
}

export function useReviewDetail(id: string | null) {
  return useAdminQuery<AdminReviewDetailView>({
    key: ['admin', 'review', id],
    url: id ? ADMIN_EP.REVIEW(id) : '',
    enabled: Boolean(id),
  });
}

function reviewAction<TBody>(buildUrl: (id: string) => string) {
  return function useAction(id: string) {
    const qc = useQueryClient();
    return useAdminMutation<TBody, AdminReviewView>(
      { method: 'post', url: () => buildUrl(id) },
      {
        onSuccess: () => {
          void qc.invalidateQueries({ queryKey: ['admin', 'reviews'] });
          void qc.invalidateQueries({ queryKey: ['admin', 'review', id] });
        },
      },
    );
  };
}

export const useHideReview = reviewAction<{ reason: string }>(ADMIN_EP.REVIEW_HIDE);
export const useUnhideReview = reviewAction<{ reason: string }>(ADMIN_EP.REVIEW_UNHIDE);
