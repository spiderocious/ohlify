import { Pressable, useWindowDimensions, View } from 'react-native';

import { AppIconButton } from '../../primitives/app-icon-button/app-icon-button';
import { AppFilePreview } from '../../primitives/app-file-preview/app-file-preview';
import { AppTag } from '../../primitives/app-tag/app-tag';
import { AppText } from '../../primitives/app-text/app-text';
import { AppIcon, AppSvg } from '../../icons';
import { colors } from '../../theme/colors';

export interface ProfessionalHeaderProfessional {
  name: string;
  role: string;
  rating: number;
  avatarUrl?: string;
}

export interface ProfessionalHeaderProps {
  professional: ProfessionalHeaderProfessional;
  resolveUri: (key: string) => Promise<string>;
  height?: number;
  onBack: () => void;
  onReviewsTap?: () => void;
}

/** 1:1 with mobile/lib/ui/widgets/professional_header/professional_header.dart. */
export function ProfessionalHeader({
  professional,
  resolveUri,
  height = 300,
  onBack,
  onReviewsTap,
}: ProfessionalHeaderProps) {
  const { width } = useWindowDimensions();

  return (
    <View style={{ height, position: 'relative', backgroundColor: colors.textNavy }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        {professional.avatarUrl ? (
          <AppFilePreview
            fileKey={professional.avatarUrl}
            resolveUri={resolveUri}
            width={width}
            height={height}
            placeholder={<HeroPlaceholder />}
            errorWidget={<HeroPlaceholder />}
          />
        ) : (
          <HeroPlaceholder />
        )}
      </View>
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.25)',
        }}
      />
      <View style={{ position: 'absolute', top: 12, left: 16 }}>
        <AppIconButton
          icon={<AppIcon name="back" size={20} color={colors.textJet} />}
          variant="ghost"
          backgroundColor={colors.background}
          size={44}
          onPress={onBack}
        />
      </View>
      <View style={{ position: 'absolute', left: 16, right: 16, bottom: 16 }}>
        <AppTag label="AVAILABLE" variant="solid" color={colors.success} />
        <View style={{ height: 10 }} />
        <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <AppText
              variant="title"
              color={colors.textWhite}
              weight="800"
              align="left"
              numberOfLines={1}
            >
              {professional.name}
            </AppText>
            <AppText variant="body" color={colors.textWhite} align="left" numberOfLines={1}>
              {professional.role}
            </AppText>
          </View>
          <View style={{ width: 12 }} />
          <ReviewsBadge rating={professional.rating} onTap={onReviewsTap} />
        </View>
      </View>
    </View>
  );
}

function HeroPlaceholder() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.textNavy,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AppIcon name="person" size={96} color={colors.border} />
    </View>
  );
}

function ReviewsBadge({ rating, onTap }: { rating: number; onTap?: () => void }) {
  return (
    <Pressable onPress={onTap}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          paddingVertical: 8,
          backgroundColor: colors.background,
          borderRadius: 100,
        }}
      >
        <AppSvg name="ratingBadge" size={14} />
        <View style={{ width: 6 }} />
        <AppText variant="body" color={colors.textAmber} weight="700" align="left">
          {String(rating)}
        </AppText>
        <View style={{ width: 6 }} />
        <AppText variant="body" color={colors.textAmber} weight="600" align="left">
          View reviews
        </AppText>
      </View>
    </Pressable>
  );
}
