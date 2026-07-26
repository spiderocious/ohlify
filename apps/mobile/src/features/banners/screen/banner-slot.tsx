import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppButton, AppText, colors } from '@ohlify/mobile-ui';
import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';
import { Pressable, View } from 'react-native';

import type { RootStackParamList } from '../../../app.navigation';
import { resolveDeeplink } from '@shared/navigation/resolve-deeplink';

import { markBannerSeen, useBanner, type BannerPlacement } from '../api/use-banner';

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

/**
 * The one banner for a screen, if there is one.
 *
 * Renders nothing the rest of the time — no placeholder, no reserved space — so
 * a screen without a live banner looks like a screen that never had one.
 *
 * Banners are not dismissable by design: they expire on their own window, and a
 * close button would only invite authors to leave them up indefinitely.
 */
export function BannerSlot({ placement }: { placement: BannerPlacement }) {
  const navigation = useNavigation<RootNavigation>();
  const { data: banner } = useBanner(placement);
  const seenRef = useRef<string | null>(null);

  // Burn the single showing when it actually renders, not when it is fetched —
  // a banner returned for a screen the user never reached has not been seen.
  useEffect(() => {
    if (!banner || seenRef.current === banner.id) return;
    seenRef.current = banner.id;
    void markBannerSeen(banner.id).catch(() => undefined);
  }, [banner]);

  if (!banner) return null;

  const open = (): void => {
    if (banner.deeplink) resolveDeeplink(navigation, banner.deeplink);
  };

  return (
    <Pressable onPress={banner.deeplink ? open : undefined} style={{ paddingVertical: 8 }}>
      <View
        style={{
          borderRadius: 16,
          overflow: 'hidden',
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        {banner.imageUrl ? (
          <Image
            source={{ uri: banner.imageUrl }}
            style={{ width: '100%', height: 120 }}
            contentFit="cover"
          />
        ) : null}
        <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
          <AppText variant="body" weight="700" color={colors.textJet} align="left">
            {banner.title}
          </AppText>
          {banner.subtitle ? (
            <>
              <View style={{ height: 2 }} />
              <AppText variant="bodySmall" color={colors.textSlate} align="left">
                {banner.subtitle}
              </AppText>
            </>
          ) : null}
          {banner.body ? (
            <>
              <View style={{ height: 6 }} />
              {/* Capped so long copy cannot push the card past its slot. */}
              <AppText variant="bodySmall" color={colors.textMuted} align="left" numberOfLines={3}>
                {banner.body}
              </AppText>
            </>
          ) : null}
          {banner.ctaLabel ? (
            <>
              <View style={{ height: 12 }} />
              <AppButton label={banner.ctaLabel} radius={100} height={38} onPress={open} />
            </>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
