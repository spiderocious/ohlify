import { useNavigate, useParams } from 'react-router-dom';

import { ROUTES, type Review } from '@ohlify/core';
import { AppButton, AppLoader, AppErrorState, DrawerService, ProfessionalHeader } from '@ohlify/ui';
import type { ApiRate, Review as ApiReview } from '@ohlify/api';

import { useOpenConversation } from '../../chat/api/use-open-conversation.js';
import { usePresence } from '../api/use-presence.js';
import { useProfessional } from '../api/use-professional.js';
import { useProfessionalRates } from '../api/use-professional-rates.js';
import { useProfessionalReviews } from '../api/use-professional-reviews.js';
import { BuyMinutesSection } from './parts/buy-minutes-section.js';
import { DescriptionSection } from './parts/description-section.js';
import { RatesSection } from './parts/rates-section.js';
import { ReviewsSection } from './parts/reviews-section.js';

function toReview(r: ApiReview): Review {
  const date = new Date(r.created_at);
  const daysAgo = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  const timeAgo = daysAgo === 0 ? 'Today' : daysAgo === 1 ? '1 day ago' : `${daysAgo} days ago`;
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
  const { data: presence } = usePresence(id);
  const openConversation = useOpenConversation();

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

  // Instant call: launch straight into the call session (backend runs the
  // minutes / online / DnD preflight). Prefer video if the pro offers it.
  const hasVideo = rates.some((r) => r.call_type === 'video');
  const goCall = () => {
    const type = hasVideo ? 'video' : 'audio';
    const search = new URLSearchParams({ pro: pro.id, type });
    if (pro.name) search.set('name', pro.name);
    const avatar = pro.cover_photo_url ?? pro.avatar_url;
    if (avatar) search.set('avatar', avatar);
    navigate(`${ROUTES.INSTANT_CALL.absPath}?${search.toString()}`);
  };

  // Open a chat with the pro (backend gates on minutes > 0).
  const goMessage = () => {
    openConversation.mutate(pro.id, {
      onSuccess: (c) => navigate(ROUTES.CHAT_THREAD.build({ id: c.id })),
      onError: (err) => {
        const e = err as { reason?: string; errorMessage?: string };
        DrawerService.toast(
          e.reason === 'forbidden'
            ? 'Buy minutes with this professional to start chatting.'
            : (e.errorMessage ?? 'Could not open chat. Please try again.'),
          { type: 'error' },
        );
      },
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface-light">
      <div className="mx-auto w-full max-w-2xl flex-1">
        <ProfessionalHeader
          name={pro.name ?? 'Professional'}
          role={pro.occupation ?? ''}
          rating={pro.rating}
          imageKey={pro.cover_photo_url ?? pro.avatar_url}
          available={presence?.reachable ?? pro.is_available}
          onBack={() => navigate(-1)}
          onReviewsTap={() => undefined}
        />
        <div className="px-4 pt-4 pb-6">
          <DescriptionSection description={description} />
          <div className="h-5" />
          <RatesSection rates={rates} />
          <div className="h-5" />
          <BuyMinutesSection professionalId={pro.id} rates={rates} />
          <div className="h-5" />
          <ReviewsSection reviews={reviews} />
          <div className="h-6" />
        </div>
      </div>
      <div className="sticky bottom-0 bg-surface-light">
        <div className="mx-auto w-full max-w-2xl px-4 pb-4 pt-2">
          <div className="flex gap-3">
            <div className="flex-1">
              <AppButton
                label="Message"
                expanded
                radius={100}
                height={52}
                variant="outline"
                onPressed={goMessage}
              />
            </div>
            <div className="flex-1">
              <AppButton label="Call" expanded radius={100} height={52} onPressed={goCall} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
