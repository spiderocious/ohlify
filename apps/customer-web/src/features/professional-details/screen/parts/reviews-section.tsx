import { IconStar, IconUser } from '@icons';
import { Repeat, Show } from 'meemaw';

import type { Review } from '@ohlify/core';
import { AppText } from '@ohlify/ui';

interface ReviewsSectionProps {
  reviews: ReadonlyArray<Review>;
}

/** Mirrors mobile/lib/features/professional_details/screen/parts/reviews_section.dart. */
export function ReviewsSection({ reviews }: ReviewsSectionProps) {
  return (
    <div>
      <AppText variant="header" weight={700} align="start" color="var(--ohl-text-jet)">
        Reviews
      </AppText>
      <Show
        when={reviews.length > 0}
        fallback={
          <div className="mt-2.5 rounded-2xl bg-background p-5 text-center">
            <AppText variant="body" align="center" color="var(--ohl-text-muted)">
              No reviews yet.
            </AppText>
          </div>
        }
      >
        <div className="mt-2.5 space-y-2.5">
          <Repeat each={reviews as Review[]}>
            {(r) => <ReviewCard key={r.id} review={r} />}
          </Repeat>
        </div>
      </Show>
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="rounded-2xl bg-background p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface">
          <IconUser size={20} color="var(--ohl-text-muted)" />
        </div>
        <div className="min-w-0 flex-1">
          <AppText
            variant="body"
            weight={600}
            align="start"
            color="var(--ohl-text-jet)"
            maxLines={1}
          >
            {review.authorName}
          </AppText>
          <AppText
            variant="bodyNormal"
            align="start"
            color="var(--ohl-text-muted)"
            className="mt-0.5"
          >
            {review.timeAgo}
          </AppText>
        </div>
        <div className="inline-flex items-center gap-1 rounded-pill bg-surface-light px-2.5 py-1.5">
          <IconStar size={12} fill="var(--ohl-text-amber)" color="var(--ohl-text-amber)" />
          <AppText variant="bodyNormal" weight={700} align="start" color="var(--ohl-text-amber)">
            {review.rating.toString()}
          </AppText>
        </div>
      </div>
      <AppText variant="body" align="start" color="var(--ohl-text-jet)" className="mt-3">
        {review.comment}
      </AppText>
    </div>
  );
}
