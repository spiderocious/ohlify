import { Text, View } from 'react-native';

import { AppSvg } from '../../icons/app-svg';
import { colors } from '../../theme/colors';

/** 1:1 with mobile/lib/ui/widgets/professional_rating/professional_rating.dart. */
export interface ProfessionalRatingProps {
  rating: number;
  reviewCount: number;
  /** When true renders a vertical divider between rating and review count (list tile variant). */
  showDivider?: boolean;
}

export function ProfessionalRating({
  rating,
  reviewCount,
  showDivider = false,
}: ProfessionalRatingProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <AppSvg name="ratingBadge" size={14} />
      <View style={{ width: 4 }} />
      <Text
        style={{
          fontFamily: 'MonaSans-Bold',
          fontSize: 13,
          fontWeight: '700',
          color: colors.textAmber,
        }}
      >
        {rating.toString()}
      </Text>
      {showDivider ? (
        <>
          <View style={{ width: 8 }} />
          <View style={{ width: 1, height: 12, backgroundColor: colors.border }} />
          <View style={{ width: 8 }} />
          <Text
            style={{
              fontFamily: 'MonaSans-Regular',
              fontSize: 13,
              fontWeight: '400',
              color: colors.textMuted,
            }}
          >
            {reviewCount} Reviews
          </Text>
        </>
      ) : (
        <>
          <View style={{ width: 4 }} />
          <Text
            style={{
              fontFamily: 'MonaSans-Regular',
              fontSize: 12,
              fontWeight: '400',
              color: colors.textMuted,
            }}
          >
            ({reviewCount} Reviews)
          </Text>
        </>
      )}
    </View>
  );
}
