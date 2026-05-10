import { useQuery } from '@tanstack/react-query';
import { apiClient, EP } from '@ohlify/api';
import type { ReviewsPage } from '@ohlify/api';

export function useProfessionalReviews(id: string) {
  return useQuery({
    queryKey: ['professional-reviews', id],
    queryFn: () =>
      apiClient
        .get(EP.PROFESSIONAL_REVIEWS(id))
        .json<ReviewsPage>(),
    staleTime: 60_000,
    enabled: Boolean(id),
  });
}
