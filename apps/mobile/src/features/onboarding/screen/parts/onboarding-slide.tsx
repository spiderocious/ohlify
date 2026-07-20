import { AppText, colors } from '@ohlify/mobile-ui';
import { Image, View } from 'react-native';

import { IMAGES } from '@shared/config/images';

/** Mirrors mobile/lib/features/onboarding/screen/parts/onboarding_slide.dart. */
export interface OnboardingSlideData {
  title: string;
  subtitle: string;
}

/** login-preview.png is 287x345 (source dimensions) — used to size the image by aspect ratio, matching Flutter's BoxFit.contain sizing to available width. */
const LOGIN_PREVIEW_ASPECT_RATIO = 287 / 345;

export function OnboardingSlide({ data }: { data: OnboardingSlideData }) {
  return (
    <View>
      <View style={{ height: 58 }} />
      <View className="px-6">
        <Image source={IMAGES.loginPreview} resizeMode="contain" style={{ width: '100%', aspectRatio: LOGIN_PREVIEW_ASPECT_RATIO }} />
      </View>
      <View style={{ height: 32 }} />
      <View className="px-8">
        <AppText variant="header" align="center" color={colors.textPrimary}>
          {data.title}
        </AppText>
      </View>
      <View style={{ height: 12 }} />
      <View className="px-10">
        <AppText variant="body" align="center" color={colors.textMuted}>
          {data.subtitle}
        </AppText>
      </View>
      <View style={{ height: 120 }} />
    </View>
  );
}
