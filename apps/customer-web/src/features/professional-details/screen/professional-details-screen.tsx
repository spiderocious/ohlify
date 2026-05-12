import { useNavigate, useParams } from 'react-router-dom';

import { ROUTES, type Review } from '@ohlify/core';
import { AppButton, AppLoader, AppErrorState, ProfessionalHeader } from '@ohlify/ui';
import type { ApiRate, Review as ApiReview } from '@ohlify/api';

import { useProfessional } from '../api/use-professional.js';
import { useProfessionalRates } from '../api/use-professional-rates.js';
import { useProfessionalReviews } from '../api/use-professional-reviews.js';
import { DescriptionSection } from './parts/description-section.js';
import { RatesSection } from './parts/rates-section.js';
import { ReviewsSection } from './parts/reviews-section.js';

function toReview(r: ApiReview): Review {
  const date = new Date(r.created_at);
  const daysAgo = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  const timeAgo =
    daysAgo === 0 ? 'Today' : daysAgo === 1 ? '1 day ago' : `${daysAgo} days ago`;
  return {
    id: r.id,
    authorName: r.reviewer_name,
    rating: r.rating,
    comment: r.comment ?? '',
    timeAgo,
    authorAvatarKey: r.reviewer_avatar_url,
  };
}

/** Mirrors mobile/lib/features/professional_details/screen/professional_details_screen.dart. */
export function ProfessionalDetailsScreen() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: pro, isLoading, isError } = useProfessional(id);
  const { data: apiRates } = useProfessionalRates(id);
  const { data: apiReviews } = useProfessionalReviews(id);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <AppLoader />
      </div>
    );
  }

  if (isError || !pro) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <AppErrorState message="Could not load professional." />
      </div>
    );
  }

  const rates: ApiRate[] = apiRates ?? [];
  const reviews: Review[] = (apiReviews?.data ?? []).map(toReview);
  const description = pro.description ?? '';

  const goSchedule = (rate?: ApiRate) => {
    const url = rate
      ? `${ROUTES.SCHEDULE_CALL.build({ id: pro.id })}?rate_id=${encodeURIComponent(rate.id)}`
      : ROUTES.SCHEDULE_CALL.build({ id: pro.id });
    navigate(url);
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface-light">
      <div className="mx-auto w-full max-w-2xl flex-1">
        <ProfessionalHeader
          name={pro.name ?? 'Professional'}
          role={pro.occupation ?? ''}
          rating={pro.rating}
          imageKey={pro.cover_photo_url ?? pro.avatar_url}
          available={pro.is_available}
          onBack={() => navigate(-1)}
          onReviewsTap={() => undefined}
        />
        <div className="px-4 pt-4 pb-6">
          <DescriptionSection description={description} />
          <div className="h-5" />
          <RatesSection rates={rates} onSelect={(r) => goSchedule(r)} />
          <div className="h-5" />
          <ReviewsSection reviews={reviews} />
          <div className="h-6" />
        </div>
      </div>
      <div className="sticky bottom-0 bg-surface-light">
        <div className="mx-auto w-full max-w-2xl px-4 pb-4 pt-2">
          <AppButton
            label="Schedule call"
            expanded
            radius={100}
            height={52}
            onPressed={() => goSchedule()}
          />
        </div>
      </div>
    </div>
  );
}
