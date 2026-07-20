import { AppIcon, AppSvg, AppText, colors } from '@ohlify/mobile-ui';
import { Image } from 'expo-image';
import { Fragment } from 'react';
import { View } from 'react-native';

import type { Review } from '@features/professionals/types/review';

export interface ReviewsSectionProps {
  reviews: Review[];
}

/** Mirrors mobile/lib/features/professional_details/screen/parts/reviews_section.dart. */
export function ReviewsSection({ reviews }: ReviewsSectionProps) {
  return (
    <View>
      <AppText variant="header" color={colors.textJet} weight="700" align="left">
        Reviews
      </AppText>
      <View style={{ height: 10 }} />
      {reviews.length === 0 ? (
        <View style={{ padding: 20, backgroundColor: colors.background, borderRadius: 16 }}>
          <AppText variant="body" color={colors.textMuted} align="center">
            No reviews yet.
          </AppText>
        </View>
      ) : (
        <View>
          {reviews.map((review, i) => (
            <Fragment key={review.id}>
              {i > 0 ? <View style={{ height: 10 }} /> : null}
              <ReviewCard review={review} />
            </Fragment>
          ))}
        </View>
      )}
    </View>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <View style={{ padding: 16, backgroundColor: colors.background, borderRadius: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <ReviewAvatar url={review.authorAvatarUrl} />
        <View style={{ width: 12 }} />
        <View style={{ flex: 1 }}>
          <AppText variant="body" color={colors.textJet} weight="600" align="left" numberOfLines={1}>
            {review.authorName}
          </AppText>
          <View style={{ height: 2 }} />
          <AppText variant="bodyNormal" color={colors.textMuted} align="left">
            {review.timeAgo}
          </AppText>
        </View>
        <RatingPill rating={review.rating} />
      </View>
      <View style={{ height: 12 }} />
      <AppText variant="body" color={colors.textJet} align="left">
        {review.comment}
      </AppText>
    </View>
  );
}

function ReviewAvatar({ url }: { url?: string }) {
  if (!url) {
    return (
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
        <AppIcon name="person" size={20} color={colors.textMuted} />
      </View>
    );
  }
  return <Image source={{ uri: url }} style={{ width: 40, height: 40, borderRadius: 20 }} contentFit="cover" />;
}

function RatingPill({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.surfaceLight, borderRadius: 100 }}>
      <AppSvg name="ratingBadge" size={12} />
      <View style={{ width: 4 }} />
      <AppText variant="bodyNormal" color={colors.textAmber} weight="700" align="left">
        {String(rating)}
      </AppText>
    </View>
  );
}
